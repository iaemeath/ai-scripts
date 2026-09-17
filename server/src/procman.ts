// 进程管理 — 控制台是进程的唯一权威管理者（single source of truth）。
// 每卡片一个子进程（键 = 卡片 id），一律 detached 常驻：stdio 重定向到 logs/<时间戳>.log +
// unref，宿主重启后凭卡片目录里 .run.json 的 pid 探活接管状态显示。停止用 taskkill /F /T 连进程树。

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { scriptDir } from './store.js';

const KEEP_LOG_FILES = 10;

export type ProcStatus = 'idle' | 'running' | 'exited';

export interface ProcState {
	status: ProcStatus;
	pid: number | null;
	startedAt: number | null;
}

interface Rec {
	pid: number;
	startedAt: number;
	logFile: string;
}

const procs = new Map<string, Rec>();

/* ---------- .run.json（pid 落盘，per 卡片目录；宿主重启后凭它接管状态显示） ---------- */

interface RunFile {
	pid: number;
	startedAt: number;
}

function runFilePath(id: string): string {
	return path.join(scriptDir(id), '.run.json');
}
function readRunFile(id: string): RunFile | null {
	try {
		return JSON.parse(fs.readFileSync(runFilePath(id), 'utf8')) as RunFile;
	} catch {
		return null;
	}
}
function writeRunEntry(id: string, rec: Rec): void {
	fs.writeFileSync(runFilePath(id), JSON.stringify({
		pid: rec.pid, startedAt: rec.startedAt,
	} satisfies RunFile), 'utf8');
}
function removeRunEntry(id: string): void {
	fs.rmSync(runFilePath(id), { force: true });
}

/* ---------- 日志落盘：logs/<时间戳>.log，保留最近 KEEP_LOG_FILES 份 ---------- */

function newLogFile(id: string): string {
	const dir = path.join(scriptDir(id), 'logs');
	fs.mkdirSync(dir, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
	const file = path.join(dir, `${stamp}.log`);
	const old = fs.readdirSync(dir).filter((n) => n.endsWith('.log')).sort();
	while (old.length >= KEEP_LOG_FILES) fs.rmSync(path.join(dir, old.shift() as string), { force: true });
	return file;
}

/* ---------- 探活 ---------- */

function alive(id: string): boolean {
	const p = procs.get(id);
	return p ? probeOrphan(p.pid) : false;
}

function probeOrphan(pid: number): boolean {
	if (process.platform !== 'win32') return true; // 非 Windows 无法廉价探测，宁可显示运行中
	try {
		const out = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH', '/FO', 'CSV'], { encoding: 'utf8' });
		return (out.stdout || '').toUpperCase().includes(`"${pid}"`);
	} catch {
		return false;
	}
}

/** 存活探测 URL：check 配置的地址可达（含自签证书）即视为运行中。同步实现（curl -k），失败即不可达。 */
function probeUrl(url: string): boolean {
	if (process.platform !== 'win32') return false;
	try {
		const r = spawnSync('curl', ['-sk', '-o', 'NUL', '--connect-timeout', '2', '--max-time', '4', url], { stdio: 'ignore' });
		return r.status === 0;
	} catch {
		return false;
	}
}

/** 按名强杀/探测一律拒绝的进程名——解释器与系统关键进程，误杀会带走 console 自己甚至系统。 */
const NAME_GUARD_DENY = new Set([
	'node.exe', 'npm.cmd', 'npx.cmd', 'cmd.exe', 'powershell.exe', 'pwsh.exe',
	'python.exe', 'pythonw.exe', 'explorer.exe', 'conhost.exe', 'windowsterminal.exe',
	'svchost.exe', 'wininit.exe', 'services.exe', 'lsass.exe', 'csrss.exe', 'dwm.exe',
	'bash.exe', 'wsl.exe', 'git.exe', 'tasklist.exe', 'taskkill.exe',
]);

/** 归一化进程名：无扩展名自动补 .exe，全小写。 */
function normalizeImageName(name: string): string {
	const lower = String(name || '').trim().toLowerCase();
	return lower.endsWith('.exe') ? lower : `${lower}.exe`;
}

/** 进程名探测：系统里存在同名进程即视为运行中。解释器/系统进程名直接拒绝（探测无意义且危险）。 */
function probeProcessName(name: string): boolean {
	if (process.platform !== 'win32') return false;
	const img = normalizeImageName(name);
	if (NAME_GUARD_DENY.has(img)) return false;
	try {
		const out = spawnSync('tasklist', ['/FI', `IMAGENAME eq ${img}`, '/NH', '/FO', 'CSV'], { encoding: 'utf8' });
		return (out.stdout || '').toUpperCase().includes(img.toUpperCase());
	} catch {
		return false;
	}
}

/** 按进程名强杀（taskkill /IM，杀所有同名实例）。被拒名单或目标不存在返回 false。 */
function killByName(name: string): boolean {
	const img = normalizeImageName(name);
	if (NAME_GUARD_DENY.has(img) || process.platform !== 'win32') return false;
	if (!probeProcessName(img)) return false;
	spawnSync('taskkill', ['/F', '/T', '/IM', img], { stdio: 'ignore' });
	return !probeProcessName(img);
}

export function statusOf(id: string, checkUrl?: string, processName?: string): ProcState {
	const p = procs.get(id);
	if (p && alive(id)) return { status: 'running', pid: p.pid, startedAt: p.startedAt };
	// 外部存活探测：服务 URL 可达（stctl 托管式）或系统里存在同名进程（手动双击的 GUI exe）都算运行中
	if (checkUrl && probeUrl(checkUrl)) return { status: 'running', pid: null, startedAt: null };
	if (processName && probeProcessName(processName)) return { status: 'running', pid: null, startedAt: null };
	if (p) return { status: 'exited', pid: p.pid, startedAt: p.startedAt };
	const run = readRunFile(id);
	if (run && probeOrphan(run.pid)) {
		// 宿主重启后接管常驻进程的状态显示（stop 走 run.json 兜底）
		return { status: 'running', pid: run.pid, startedAt: run.startedAt };
	}
	if (run) removeRunEntry(id);
	return { status: 'idle', pid: null, startedAt: null };
}

/* ---------- 启停 ---------- */

// Windows 实测：detached + shell:true 时子进程拿不到重定向句柄（输出全丢），
// 必须绕过 shell 直接拉起解释器（与 quota-tools v2 的 process.execPath 直拉同款）。

/** 引号感知分词，兼容带空格的路径（json 里写成 "D:\\soft\\my app.exe" 即可）。 */
export function splitCommand(cmd: string): { program: string; argv: string[] } {
	const parts: string[] = [];
	const re = /"([^"]*)"|(\S+)/g;
	for (const m of cmd.matchAll(re)) parts.push(m[1] ?? m[2]);
	return { program: parts[0] ?? '', argv: parts.slice(1) };
}

/** 一次性拉起（不跟踪、不落 run 文件）——「打开」动作用：explorer 网页/文件等瞬退命令。 */
export function spawnDetached(command: string, cwd: string): void {
	const { program, argv } = splitCommand(command);
	const child = spawn(program, argv, { cwd, windowsHide: true, detached: true, stdio: 'ignore' });
	child.unref();
}

export function startProc(id: string, command: string, cwd: string): ProcState {
	if (alive(id)) throw new Error('已在运行中，勿重复启动');
	if (readRunFile(id)) removeRunEntry(id); // 残留的 pid 引用，清理（不主动杀）

	const logFile = newLogFile(id);
	const rec: Rec = { pid: 0, startedAt: Date.now(), logFile };
	const { program, argv } = splitCommand(command);
	fs.appendFileSync(logFile, `$ ${command}\n[${new Date(rec.startedAt).toLocaleString('zh-CN', { hour12: false })}] start (cwd=${cwd})\n`);
	const fd = fs.openSync(logFile, 'a');
	const child = spawn(program, argv, {
		cwd, windowsHide: true, detached: true, stdio: ['ignore', fd, fd],
		env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
	});
	fs.closeSync(fd);
	child.unref();
	rec.pid = child.pid ?? 0;
	child.on('error', (e: Error) => {
		fs.appendFileSync(logFile, `[host] 进程启动失败: ${e.message}\n`);
	});

	procs.set(id, rec);
	writeRunEntry(id, rec);
	return statusOf(id);
}

/* ---------- 内存占用：单次 tasklist 快照批量解析（列表页每轮一次，尽力而为） ---------- */

/** 查询一批 pid 的内存占用（MB）。非 Windows 返回空表；解析失败静默（内存列是锦上添花）。 */
export function memOfPids(pids: (number | null | undefined)[]): Map<number, number> {
	const want = new Set(pids.filter((p): p is number => !!p && p > 0));
	const out = new Map<number, number>();
	if (!want.size || process.platform !== 'win32') return out;
	try {
		const r = spawnSync('tasklist', ['/FO', 'CSV', '/NH'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
		for (const line of (r.stdout || '').split('\n')) {
			const cols = line.split('","');
			if (cols.length < 5) continue;
			const pid = parseInt(cols[1], 10);
			if (!want.has(pid)) continue;
			const kb = parseInt(cols[4].replace(/["K,\s]/g, ''), 10) || 0;
			out.set(pid, Math.max(1, Math.round(kb / 1024)));
		}
	} catch {
		/* 尽力而为 */
	}
	return out;
}

export function stopProc(id: string, stopCmd?: string, processName?: string): boolean {
	if (stopCmd) {
		// 优雅停止：执行登记的停止命令（如 stctl --stop），并清掉本控制台的跟踪痕迹
		spawnDetached(stopCmd, scriptDir(id));
		procs.delete(id);
		removeRunEntry(id);
		return true;
	}
	let pid: number | null = null;
	if (alive(id)) pid = procs.get(id)!.pid;
	if (pid === null) {
		const run = readRunFile(id);
		if (run && probeOrphan(run.pid)) pid = run.pid;
	}
	if (pid === null) {
		// 没有可跟踪的 pid：登记了进程名则按名兜底强杀（外部手动启动的卡片），否则无事可做
		const killed = processName ? killByName(processName) : false;
		removeRunEntry(id);
		return killed;
	}
	if (process.platform === 'win32') {
		spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
	}
	removeRunEntry(id);
	return true;
}
