// Script routes — 卡片管理，登记册模型：script.json 只管登记（名字/描述/一条启动命令行），
// 启动 = 执行该命令行（cwd 固定为卡片目录），关闭 = 杀进程树。
// 服务端负责：卡片列表（含运行中内存占用）、新建、命令路径浏览选择、启停、script.json 读写。
// 全部为本地操作。

import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import {
	listScriptIds, readManifest, safeJoin, scriptDir, SCRIPT_ID_RE, type ScriptManifest,
} from './store.js';
import { memOfPids, spawnDetached, startProc, statusOf, stopProc } from './procman.js';

export const scripts = new Hono();

interface ScriptCard {
	id: string;
	name: string;
	desc?: string;
	/** 启动命令行（登记原文）。 */
	start: string;
	/** 打开动作命令行（可选）：出现「打开」按钮，如 explorer http://localhost:8899/xxx.html。 */
	open?: string;
	order?: number;
	status: ReturnType<typeof statusOf>;
	/** 运行中进程的内存占用（MB）；列表端点批量填充。 */
	memMB?: number;
}

function toCard(id: string, m: ScriptManifest): ScriptCard {
	return {
		id,
		name: m.name,
		desc: m.desc,
		start: m.start || '',
		open: m.open || undefined,
		order: m.order,
		status: statusOf(id, m.check, m.process),
	};
}

const err = (c: any, code: number, msg: string) => c.json({ error: msg }, code as 400);

/* ===================== 卡片列表 ===================== */

/** GET /api/scripts */
scripts.get('/', (c) => {
	const cards = listScriptIds().map((id) => {
		let m: ScriptManifest;
		try {
			m = readManifest(id);
		} catch {
			m = { id, name: id, desc: '（script.json 损坏或不可读）' };
		}
		return toCard(id, m);
	});
	cards.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
	// 运行中的卡片批量查一次内存占用（单次 tasklist 快照，锦上添花，失败静默）
	const mem = memOfPids(cards.filter((x) => x.status.status === 'running').map((x) => x.status.pid));
	for (const x of cards) {
		const mb = x.status.pid ? mem.get(x.status.pid) : undefined;
		if (mb) x.memMB = mb;
	}
	return c.json(cards);
});

/* ===================== 命令路径浏览选择（填启动命令用） ===================== */

/** GET /api/scripts/browse?path=<目录> — 无 path 时返回盘符列表；返回子目录 + 可执行文件。 */
scripts.get('/browse', (c) => {
	const raw = (c.req.query('path') || '').trim();
	if (!raw) {
		const drives: string[] = [];
		for (let i = 67; i <= 90; i++) {
			// C..Z
			const drive = `${String.fromCharCode(i)}:\\`;
			try {
				fs.readdirSync(drive);
				drives.push(drive);
			} catch {
				/* 盘符不存在 */
			}
		}
		return c.json({ path: '', parent: null, dirs: drives, files: [] });
	}
	const dir = path.resolve(raw);
	if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return err(c, 400, `目录不存在: ${dir}`);
	const dirs: string[] = [];
	const files: string[] = [];
	for (const name of fs.readdirSync(dir)) {
		if (name.startsWith('.')) continue;
		const full = path.join(dir, name);
		try {
			const st = fs.statSync(full);
			if (st.isDirectory()) dirs.push(name);
			else if (/\.(exe|bat|cmd|lnk)$/i.test(name)) files.push(name);
		} catch {
			/* 无权限项跳过 */
		}
	}
	const parent = path.dirname(dir);
	return c.json({
		path: dir,
		parent: parent === dir ? null : parent,
		dirs: dirs.sort((a, b) => a.localeCompare(b)),
		files: files.sort((a, b) => a.localeCompare(b)),
	});
});

/* ===================== 新建 ===================== */

/** POST /api/scripts — 登记。body { name, desc?, start, open?, order? } — 均为命令行。 */
scripts.post('/', async (c) => {
	const b = await c.req.json<{ name: string; desc?: string; start?: string; open?: string; order?: number }>();
	if (!String(b.name || '').trim()) return err(c, 400, '显示名不能为空');
	if (!String(b.start || '').trim()) return err(c, 400, '启动命令不能为空');

	const id = `card-${Date.now().toString(36)}`;
	const dir = scriptDir(id);
	if (fs.existsSync(dir)) return err(c, 409, '目录冲突，请重试');

	const manifest: ScriptManifest = {
		id,
		name: String(b.name).trim(),
		desc: String(b.desc || '').trim(),
		start: String(b.start).trim(),
		open: String(b.open || '').trim() || undefined,
		order: typeof b.order === 'number' ? b.order : 99,
	};
	try {
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, 'script.json'), JSON.stringify(manifest, null, '\t'), 'utf8');
	} catch (e) {
		fs.rmSync(dir, { recursive: true, force: true }); // 半成品不留在卡片列表里
		return err(c, 500, (e as Error).message);
	}
	return c.json({ ok: true, id });
});

function loadOr404(c: any): { id: string; manifest: ScriptManifest } | Response {
	const id = c.req.param('id');
	if (!SCRIPT_ID_RE.test(id)) return err(c, 400, '非法卡片ID');
	if (!fs.existsSync(scriptDir(id))) return err(c, 404, `卡片 ${id} 不存在`);
	let manifest: ScriptManifest;
	try {
		manifest = readManifest(id);
	} catch (e) {
		return err(c, 500, `script.json 读取失败: ${(e as Error).message}`);
	}
	return { id, manifest };
}

/** DELETE /api/scripts/:id — 删除整个卡片目录（运行中拒绝）。 */
scripts.delete('/:id', (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const { id } = loaded;
	if (statusOf(id, loaded.manifest.check, loaded.manifest.process).status === 'running') {
		return err(c, 409, '正在运行，请先关闭');
	}
	fs.rmSync(scriptDir(id), { recursive: true, force: true });
	return c.json({ ok: true });
});

/* ===================== 启动 / 关闭 ===================== */

/** POST /api/scripts/:id/start — 执行登记的启动命令行；观察 1.5s 后确认进程仍存活（或 check
 *  探测可达）才算成功，秒退判启动失败并把日志尾部带回提示。transient 卡片（explorer 打开页
 *  面类，瞬退属预期）跳过判定直接返回。 */
scripts.post('/:id/start', async (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const { id, manifest } = loaded;
	if (!manifest.start) return err(c, 400, '该卡片未配置启动命令');
	try {
		startProc(id, manifest.start, scriptDir(id));
	} catch (e) {
		return err(c, 409, (e as Error).message);
	}
	if (manifest.transient) return c.json({ ok: true, status: statusOf(id, manifest.check) });
	await new Promise((r) => setTimeout(r, 1500));
	const st = statusOf(id, manifest.check);
	if (st.status === 'running') return c.json({ ok: true, status: st });
	return c.json({
		ok: false,
		reason: st.status === 'exited' ? '进程启动后立即退出' : '启动后未进入运行状态',
		logTail: latestLogTail(id),
	});
});

/** POST /api/scripts/:id/open — 执行「打开」命令行（一次性拉起，不跟踪进程）。 */
scripts.post('/:id/open', (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	if (!loaded.manifest.open) return err(c, 400, '该卡片未配置打开动作');
	try {
		spawnDetached(loaded.manifest.open, scriptDir(loaded.id));
		return c.json({ ok: true });
	} catch (e) {
		return err(c, 500, (e as Error).message);
	}
});

/** POST /api/scripts/:id/stop — 优雅停止（登记了 stop 命令）或兜底强杀进程树。 */
scripts.post('/:id/stop', (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	return c.json({ ok: true, killed: stopProc(loaded.id, loaded.manifest.stop, loaded.manifest.process) });
});

/* ===================== 启动失败判定（启动日志本就落盘在 <卡片>/logs/，失败时取尾部提示） ===================== */

/** 卡片最新一份启动日志的尾部（失败提示用）。 */
function latestLogTail(id: string, maxLen = 1200): string {
	try {
		const dir = path.join(scriptDir(id), 'logs');
		const files = fs.readdirSync(dir).filter((n) => n.endsWith('.log')).sort();
		const latest = files[files.length - 1];
		if (!latest) return '（无日志文件）';
		let content = fs.readFileSync(path.join(dir, latest), 'utf8').trimEnd();
		if (content.length > maxLen) content = '…' + content.slice(-maxLen);
		return content;
	} catch {
		return '（日志读取失败）';
	}
}

/* ===================== script.json 读写（编辑表单的数据通道） ===================== */

scripts.get('/:id/file', (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const rel = c.req.query('path') || '';
	const abs = safeJoin(scriptDir(loaded.id), rel);
	if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return err(c, 404, '文件不存在');
	return c.json({ path: rel, content: fs.readFileSync(abs, 'utf8') });
});

/** PUT /:id/file?path=<rel> — 写卡片内文件；script.json 写入前做 JSON 校验防写坏。 */
scripts.put('/:id/file', async (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const rel = c.req.query('path') || '';
	const body = await c.req.json().catch(() => null) as { content?: string } | null;
	if (!body || typeof body['content'] !== 'string') return err(c, 400, 'content is required');
	if (rel === 'script.json') {
		try {
			JSON.parse(body['content']);
		} catch (e) {
			return err(c, 400, `JSON 不合法: ${(e as Error).message}`);
		}
	}
	fs.writeFileSync(safeJoin(scriptDir(loaded.id), rel), body['content'], 'utf8');
	return c.json({ ok: true });
});
