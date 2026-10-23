// 进程管理 v2 — 探测全异步 + 状态缓存后台刷新：请求路径零阻塞、零 spawnSync。
// 重构动机（2026-09-24）：旧版每次列表轮询逐卡同步 spawnSync（tasklist/curl），隐藏控制台
// 链路下子进程偶发不退出（实测 probeUrl 的 curl --max-time 4 挂了 2h+），spawnSync 永不返回
// → 事件循环冻结 → 宿主整体卡死。新版三条原则：
//   1) 请求路径只读缓存，毫秒级返回；
//   2) 探测全部挪到后台刷新循环：pid 用 process.kill(pid,0)（零子进程）、URL 用原生
//      http/https（自签放行 + 硬超时）、进程名与内存合并为一次异步 tasklist 快照；
//   3) 一切外部命令（tasklist/taskkill）异步 spawn + 硬超时 + kill，绝不 spawnSync。

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { listScriptIds, readManifest, scriptDir } from './store.js';

const KEEP_LOG_FILES = 10;
const REFRESH_MS = 2500; // 缓存后台刷新间隔（UI 轮询 5s，减半保新鲜）
const URL_TIMEOUT_MS = 2500; // URL 探活硬超时
const CMD_TIMEOUT_MS = 8000; // tasklist/taskkill 等外部命令硬超时（异步等待，超时强杀）

export type ProcStatus = 'idle' | 'running' | 'exited';

export interface ProcState {
	status: ProcStatus;
	pid: number | null;
	startedAt: number | null;
	memMB?: number;
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

/* ---------- 异步外部命令：超时强杀；绝不 spawnSync ---------- */

function runCmd(program: string, args: string[], timeoutMs: number): Promise<string> {
	return new Promise((resolve) => {
		let child: ChildProcess;
		try {
			child = spawn(program, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
		} catch {
			resolve('');
			return;
		}
		let out = '';
		let settled = false;
		const timer = setTimeout(() => {
			if (settled) return;
			settled = true;
			try {
				child.kill();
			} catch {
				/* 尽力而为 */
			}
			resolve(out);
		}, timeoutMs);
		child.stdout?.on('data', (d: Buffer) => {
			out += d.toString('utf8');
		});
		child.on('error', () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve('');
		});
		child.on('close', () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(out);
		});
	});
}

/* ---------- tasklist 全量快照：一次解析出「镜像名集合 + pid→内存」，进程名探测与内存共用 ---------- */

interface Snap {
	/** 小写镜像名（含 .exe）。 */
	names: Set<string>;
	/** pid → 内存 MB。 */
	memOf: Map<number, number>;
}

async function snapshot(): Promise<Snap> {
	const snap: Snap = { names: new Set(), memOf: new Map() };
	if (process.platform !== 'win32') return snap;
	const out = await runCmd('tasklist', ['/FO', 'CSV', '/NH'], CMD_TIMEOUT_MS);
	for (const line of out.split('\n')) {
		const cols = line.split('","');
		if (cols.length < 5) continue;
		const name = cols[0].replace(/^"/, '').trim().toLowerCase();
		const pid = parseInt(cols[1], 10);
		if (!name || !pid) continue;
		snap.names.add(name);
		const kb = parseInt(cols[4].replace(/["K,\s]/g, ''), 10) || 0;
		snap.memOf.set(pid, Math.max(1, Math.round(kb / 1024)));
	}
	return snap;
}

/* ---------- pid 存活：零子进程（process.kill 信号 0 = 存活探测，Windows 原生支持） ---------- */

export function pidAlive(pid: number | null | undefined): boolean {
	if (!pid || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (e) {
		// EPERM = 进程存在但无权限（如系统进程）——也算存活
		return (e as NodeJS.ErrnoException).code === 'EPERM';
	}
}

/* ---------- URL 存活：原生 http/https（自签放行 + 硬超时；任何 HTTP 应答即视为运行中） ---------- */

export function probeUrl(url: string, timeoutMs = URL_TIMEOUT_MS): Promise<boolean> {
	return new Promise((resolve) => {
		let req: http.ClientRequest | null = null;
		let capTimer: ReturnType<typeof setTimeout> | undefined;
		let done = false;
		const finish = (ok: boolean) => {
			if (done) return;
			done = true;
			if (capTimer) clearTimeout(capTimer);
			try {
				req?.destroy();
			} catch {
				/* 已结束 */
			}
			resolve(ok);
		};
		capTimer = setTimeout(() => finish(false), timeoutMs + 300);
		try {
			const u = new URL(url);
			const client = u.protocol === 'https:' ? https : http;
			req = client.get(url, { rejectUnauthorized: false, timeout: timeoutMs }, (res) => {
				res.resume(); // 拿到应答即为结论，正文弃掉
				finish(true);
			});
			req.on('timeout', () => finish(false));
			req.on('error', () => finish(false));
		} catch {
			finish(false);
		}
	});
}

/* ---------- 进程名守卫：解释器与系统关键进程，按名探测/强杀一律拒绝 ---------- */

const NAME_GUARD_DENY = new Set([
	'node.exe', 'npm.cmd', 'npx.cmd', 'cmd.exe', 'powershell.exe', 'pwsh.exe',
	'python.exe', 'pythonw.exe', 'explorer.exe', 'conhost.exe', 'windowsterminal.exe',
	'svchost.exe', 'wininit.exe', 'services.exe', 'lsass.exe', 'csrss.exe', 'dwm.exe',
	'bash.exe', 'wsl.exe', 'git.exe', 'tasklist.exe', 'taskkill.exe',
]);

/** 归一化进程名：无扩展名自动补 .exe，全小写。 */
export function normalizeImageName(name: string): string {
	const lower = String(name || '').trim().toLowerCase();
	return lower.endsWith('.exe') ? lower : `${lower}.exe`;
}

/* ---------- 状态缓存 + 后台刷新（单飞：并发调用共享同一次刷新） ---------- */

interface CachedState extends ProcState {
	checkedAt: number;
}

const statusCache = new Map<string, CachedState>();
let inflight: Promise<void> | null = null;

async function computeStatus(id: string, checkUrl: string | undefined, processName: string | undefined, snap: Snap): Promise<CachedState> {
	const checkedAt = Date.now();
	const p = procs.get(id);
	if (p && pidAlive(p.pid)) {
		return { status: 'running', pid: p.pid, startedAt: p.startedAt, memMB: snap.memOf.get(p.pid), checkedAt };
	}
	// 外部存活探测：服务 URL 可达（stctl 托管式）或系统里存在同名进程（手动双击的 GUI exe）都算运行中
	if (checkUrl && await probeUrl(checkUrl)) return { status: 'running', pid: null, startedAt: null, checkedAt };
	if (processName) {
		const img = normalizeImageName(processName);
		if (!NAME_GUARD_DENY.has(img) && snap.names.has(img)) return { status: 'running', pid: null, startedAt: null, checkedAt };
	}
	if (p) return { status: 'exited', pid: p.pid, startedAt: p.startedAt, checkedAt };
	const run = readRunFile(id);
	if (run && pidAlive(run.pid)) {
		// 宿主重启后接管常驻进程的状态显示（stop 走 run.json 兜底）
		return { status: 'running', pid: run.pid, startedAt: run.startedAt, memMB: snap.memOf.get(run.pid), checkedAt };
	}
	if (run) removeRunEntry(id);
	return { status: 'idle', pid: null, startedAt: null, checkedAt };
}

function refreshAll(): Promise<void> {
	if (!inflight) {
		inflight = (async () => {
			try {
				const snap = await snapshot();
				const ids = listScriptIds();
				const states = await Promise.all(ids.map(async (id) => {
					let m;
					try {
						m = readManifest(id);
					} catch {
						return null;
					}
					return computeStatus(id, m.check, m.process, snap);
				}));
				ids.forEach((id, i) => {
					const st = states[i];
					if (st) statusCache.set(id, st);
				});
			} catch {
				/* 尽力而为 */
			} finally {
				inflight = null;
			}
		})();
	}
	return inflight;
}

/** 触发一次尽快刷新（fire-and-forget；启停后调用让状态立刻跟上）。 */
export function refreshSoon(): void {
	void refreshAll();
}

// 启动即预热 + 周期后台刷新（unref：不阻进程退出）
void refreshAll();
const refreshTimer = setInterval(() => void refreshAll(), REFRESH_MS);
refreshTimer.unref();

/** 当前缓存状态 —— 请求路径唯一入口，零等待。 */
export function statusOf(id: string): ProcState {
	const c = statusCache.get(id);
	return c ? { status: c.status, pid: c.pid, startedAt: c.startedAt, memMB: c.memMB } : { status: 'idle', pid: null, startedAt: null };
}

/** 冷启动首次列表时等待缓存就绪（单飞有界，探测全部异步不阻塞事件循环）。 */
export function warmup(): Promise<void> {
	return statusCache.size ? Promise.resolve() : refreshAll();
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
	const child = spawn(program, argv, { cwd, windowsHide: true, stdio: 'ignore', env: cardEnv() });
	child.unref();
}

/** 卡片进程环境：捆绑 node 运行时目录前插 PATH（AI_SCRIPTS_NODE_DIR 由 Electron 主进程注入，
 *  发到没装 Node 的机器上，`node xxx.cjs` 类登记命令照常解析到打包内的 node.exe）。 */
function cardEnv(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' };
	const nodeDir = process.env.AI_SCRIPTS_NODE_DIR;
	if (nodeDir) env.PATH = `${nodeDir}${path.delimiter}${env.PATH ?? ''}`;
	return env;
}

export function startProc(id: string, command: string, cwd: string): ProcState {
	const tracked = procs.get(id);
	if (tracked && pidAlive(tracked.pid)) throw new Error('已在运行中，勿重复启动');
	if (readRunFile(id)) removeRunEntry(id); // 残留的 pid 引用，清理（不主动杀）

	const logFile = newLogFile(id);
	const rec: Rec = { pid: 0, startedAt: Date.now(), logFile };
	const { program, argv } = splitCommand(command);
	fs.appendFileSync(logFile, `$ ${command}\n[${new Date(rec.startedAt).toLocaleString('zh-CN', { hour12: false })}] start (cwd=${cwd})\n`);
	const fd = fs.openSync(logFile, 'a');
	// detached 勿加：DETACHED_PROCESS 让子进程没有控制台，tsx/vite 这类内部二次 spawn
	// （stdio inherit）的孙进程拿不到可继承控制台，Win11 默认终端下会新建一个可见终端窗口
	// （实测弹窗标题就是 node.exe）。非 detached + windowsHide：整条子进程链共用一个隐藏
	// 控制台，全程无窗口；Windows 父进程退出不连带杀子进程，常驻接管语义不受影响。
	const child = spawn(program, argv, {
		cwd, windowsHide: true, stdio: ['ignore', fd, fd],
		env: cardEnv(),
	});
	fs.closeSync(fd);
	child.unref();
	rec.pid = child.pid ?? 0;
	child.on('error', (e: Error) => {
		fs.appendFileSync(logFile, `[host] 进程启动失败: ${e.message}\n`);
	});

	procs.set(id, rec);
	writeRunEntry(id, rec);
	// 立刻入缓存（UI 即时反馈运行中），内存占用等下一轮刷新补
	statusCache.set(id, { status: 'running', pid: rec.pid, startedAt: rec.startedAt, checkedAt: Date.now() });
	refreshSoon();
	return statusOf(id);
}

/** 按进程名强杀（taskkill /IM，杀所有同名实例）。被拒名单或目标不存在返回 false。 */
async function killByName(name: string): Promise<boolean> {
	const img = normalizeImageName(name);
	if (NAME_GUARD_DENY.has(img) || process.platform !== 'win32') return false;
	const before = await snapshot();
	if (!before.names.has(img)) return false;
	await runCmd('taskkill', ['/F', '/T', '/IM', img], CMD_TIMEOUT_MS);
	const after = await snapshot();
	return !after.names.has(img);
}

export async function stopProc(id: string, stopCmd?: string, processName?: string): Promise<boolean> {
	if (stopCmd) {
		// 优雅停止：执行登记的停止命令（如 stctl --stop），并清掉本控制台的跟踪痕迹
		spawnDetached(stopCmd, scriptDir(id));
		procs.delete(id);
		removeRunEntry(id);
		refreshSoon();
		return true;
	}
	let pid: number | null = null;
	const tracked = procs.get(id);
	if (tracked && pidAlive(tracked.pid)) pid = tracked.pid;
	if (pid === null) {
		const run = readRunFile(id);
		if (run && pidAlive(run.pid)) pid = run.pid;
	}
	if (pid === null) {
		// 没有可跟踪的 pid：登记了进程名则按名兜底强杀（外部手动启动的卡片），否则无事可做
		const killed = processName ? await killByName(processName) : false;
		removeRunEntry(id);
		refreshSoon();
		return killed;
	}
	if (process.platform === 'win32') {
		await runCmd('taskkill', ['/F', '/T', '/PID', String(pid)], CMD_TIMEOUT_MS);
	}
	removeRunEntry(id);
	refreshSoon();
	return true;
}
