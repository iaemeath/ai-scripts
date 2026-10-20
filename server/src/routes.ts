// Script routes — 卡片管理，登记册模型：script.json 只管登记（名字/描述/一条启动命令行），
// 启动 = 执行该命令行（cwd 固定为卡片目录），关闭 = 杀进程树。
// 服务端负责：卡片列表（含运行中内存占用）、新建、命令路径浏览选择、启停、script.json 读写。
// 全部为本地操作。

import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import {
	isBuiltinCard, listScriptIds, readManifest, safeJoin, scriptDir, SCRIPT_ID_RE, type ScriptManifest,
} from './store.js';
import { pidAlive, probeUrl, refreshSoon, spawnDetached, startProc, statusOf, stopProc, warmup } from './procman.js';

export const scripts = new Hono();

interface ScriptCard {
	id: string;
	name: string;
	desc?: string;
	/** 启动命令行（登记原文）。 */
	start: string;
	/** 打开动作命令行（可选）：出现「打开」按钮，如 explorer http://localhost:8899/xxx.html。 */
	open?: string;
	/** 是否内置（按卡片所在目录判定：仓库 scripts/=内置，~/.ai-scripts/=外置）：仅用于列表分节展示。 */
	builtin: boolean;
	order?: number;
	status: ReturnType<typeof statusOf>;
	/** 运行中进程的内存占用（MB）；列表端点批量填充。 */
	memMB?: number;
}

function toCard(id: string, m: ScriptManifest): ScriptCard {
	const status = statusOf(id); // 读缓存（后台 2.5s 刷新），请求路径零探测
	return {
		id,
		name: m.name,
		desc: m.desc,
		start: m.start || '',
		open: m.open || undefined,
		builtin: isBuiltinCard(id),
		order: m.order,
		status,
		memMB: status.memMB,
	};
}

const err = (c: any, code: number, msg: string) => c.json({ error: msg }, code as 400);

/* ===================== 卡片列表 ===================== */

/** GET /api/scripts — 读状态缓存，毫秒级返回；探测在后台循环里做（procman）。 */
scripts.get('/', async (c) => {
	await warmup(); // 仅冷启动首次列表会等一轮预热（单飞有界，全部异步不阻塞其它请求）
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
	return c.json(cards);
});

/* ===================== 命令路径浏览选择（填启动命令用） ===================== */

/** GET /api/scripts/browse?path=<目录> — 无 path 时返回盘符列表；返回子目录 + 可执行文件。
 *  全异步：断连的网络盘等慢介质上 readdir 会挂起数秒，同步版会冻结事件循环拖垮全部轮询。 */
scripts.get('/browse', async (c) => {
	const raw = (c.req.query('path') || '').trim();
	if (!raw) {
		const drives: string[] = [];
		for (let i = 67; i <= 90; i++) {
			// C..Z
			const drive = `${String.fromCharCode(i)}:\\`;
			try {
				await fs.promises.readdir(drive);
				drives.push(drive);
			} catch {
				/* 盘符不存在 */
			}
		}
		return c.json({ path: '', parent: null, dirs: drives, files: [] });
	}
	const dir = path.resolve(raw);
	try {
		if (!(await fs.promises.stat(dir)).isDirectory()) return err(c, 400, `目录不存在: ${dir}`);
	} catch {
		return err(c, 400, `目录不存在: ${dir}`);
	}
	const dirs: string[] = [];
	const files: string[] = [];
	let entries: fs.Dirent[] = [];
	try {
		entries = await fs.promises.readdir(dir, { withFileTypes: true });
	} catch {
		entries = []; // 无权限等读取失败按空目录呈现
	}
	for (const ent of entries) {
		if (ent.name.startsWith('.')) continue;
		if (ent.isDirectory()) dirs.push(ent.name);
		else if (/\.(exe|bat|cmd|lnk)$/i.test(ent.name)) files.push(ent.name);
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

/** POST /api/scripts — 登记（新卡片落外置根 ~/.ai-scripts）。body { name, desc?, start, open?, order? }。 */
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
scripts.delete('/:id', async (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const { id, manifest } = loaded;
	// 缓存判运行 + check 地址新鲜探测兜底（防外部启动的实例被误删）
	const running = statusOf(id).status === 'running'
		|| (manifest.check ? await probeUrl(manifest.check, 1500) : false);
	if (running) {
		return err(c, 409, '正在运行，请先关闭');
	}
	fs.rmSync(scriptDir(id), { recursive: true, force: true });
	return c.json({ ok: true });
});

/* ===================== 启动 / 关闭 ===================== */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST /api/scripts/:id/start — 执行登记的启动命令行；就绪观察：有 check 的轮询 URL
 *  （最多 6s，就绪即返回），无 check 的观察进程存活（~800ms）；秒退/超时判失败并带日志尾部。
 *  transient 卡片（explorer 打开页面类，瞬退属预期）跳过判定直接返回。
 *  另：启动前对 check 地址做端口占用预检——已可达 = 旧实例还在（含非本控制台启动的），
 *  直接 409 给明确提示，避免起一个秒挂的重复实例。 */
scripts.post('/:id/start', async (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const { id, manifest } = loaded;
	if (!manifest.start) return err(c, 400, '该卡片未配置启动命令');
	if (statusOf(id).status === 'running') return err(c, 409, '已在运行中，勿重复启动');
	if (manifest.check && await probeUrl(manifest.check, 1200)) {
		return err(c, 409, '服务端口已可达（疑似旧实例仍在运行），请先「关闭」后再启动');
	}
	try {
		startProc(id, manifest.start, scriptDir(id));
	} catch (e) {
		return err(c, 409, (e as Error).message);
	}
	if (manifest.transient) return c.json({ ok: true, status: statusOf(id) });
	const pid = statusOf(id).pid;
	const hasCheck = !!manifest.check;
	const deadline = Date.now() + (hasCheck ? 6000 : 1500);
	while (Date.now() < deadline) {
		await sleep(hasCheck ? 400 : 750);
		if (hasCheck && manifest.check && await probeUrl(manifest.check, 1500)) {
			refreshSoon();
			return c.json({ ok: true, status: statusOf(id) });
		}
		if (pid !== null && !pidAlive(pid)) break; // 进程没了，跳出走失败分支
		if (!hasCheck && pidAlive(pid)) {
			refreshSoon();
			return c.json({ ok: true, status: statusOf(id) });
		}
	}
	return c.json({
		ok: false,
		reason: pid !== null && !pidAlive(pid) ? '进程启动后立即退出' : '启动后未进入运行状态',
		logTail: await latestLogTail(id),
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

/** POST /api/scripts/:id/stop — 优雅停止（登记了 stop 命令）或兜底强杀进程树（异步 taskkill）。 */
scripts.post('/:id/stop', async (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	return c.json({ ok: true, killed: await stopProc(loaded.id, loaded.manifest.stop, loaded.manifest.process) });
});

/* ===================== 卡片日志（logs/ 目录列表 + 尾部查看） ===================== */

/** 日志文件名白名单：procman 落盘名是 <ISO时间戳>.log，只放行安全字符，杜绝路径穿越。 */
const LOG_NAME_RE = /^[a-zA-Z0-9._-]+\.log$/;

/** GET /:id/logs — 列出 logs/ 目录（新→旧），带大小/修改时间。 */
scripts.get('/:id/logs', async (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const dir = path.join(scriptDir(loaded.id), 'logs');
	let names: string[] = [];
	try {
		names = (await fs.promises.readdir(dir)).filter((n) => n.endsWith('.log')).sort().reverse();
	} catch {
		names = []; // 无 logs 目录（从未启动过）按空列表呈现
	}
	const items = await Promise.all(names.map(async (name) => {
		const st = await fs.promises.stat(path.join(dir, name)).catch(() => null);
		return {
			name,
			sizeKB: st ? Math.max(1, Math.round(st.size / 1024)) : 0,
			mtime: st ? st.mtimeMs : 0,
		};
	}));
	return c.json(items);
});

/** GET /:id/logs/tail?name=<文件名>&maxLen=<字符数> — 日志尾部（排障 / 看运行输出）。 */
scripts.get('/:id/logs/tail', async (c) => {
	const loaded = loadOr404(c);
	if (loaded instanceof Response) return loaded;
	const name = path.basename(String(c.req.query('name') || ''));
	if (!LOG_NAME_RE.test(name)) return err(c, 400, '非法日志文件名');
	const maxLen = Math.min(Number(c.req.query('maxLen')) || 4000, 20000);
	try {
		const content = (await fs.promises.readFile(path.join(scriptDir(loaded.id), 'logs', name), 'utf8')).trimEnd();
		return c.json({ name, content: content.length > maxLen ? '…' + content.slice(-maxLen) : content });
	} catch {
		return err(c, 404, '日志不存在');
	}
});

/* ===================== 启动失败判定（启动日志本就落盘在 <卡片>/logs/，失败时取尾部提示） ===================== */

/** 卡片最新一份启动日志的尾部（失败提示用；异步读取不阻塞事件循环）。 */
async function latestLogTail(id: string, maxLen = 1200): Promise<string> {
	try {
		const dir = path.join(scriptDir(id), 'logs');
		const files = (await fs.promises.readdir(dir)).filter((n) => n.endsWith('.log')).sort();
		const latest = files[files.length - 1];
		if (!latest) return '（无日志文件）';
		let content = (await fs.promises.readFile(path.join(dir, latest), 'utf8')).trimEnd();
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
