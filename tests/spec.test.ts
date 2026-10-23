// 迁移规约测试（阶段 0）——把 procman/store 的行为规则固化为可执行规约。
// Rust 重写（ai-scripts-rs crates/core）以同套用例做对齐验收：这里的每一条 test
// 在 Rust 侧都应有同名的对应断言（tests/spec.rs）。
// 运行：npm run test（tsx --test）

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { splitCommand, normalizeImageName, pidAlive, probeUrl, startProc, stopProc, statusOf } from '../server/src/procman.js';
import { cardsRoot, listScriptIds, readManifest, safeJoin, SCRIPT_ID_RE } from '../server/src/store.js';

/* ---------- splitCommand：引号感知分词 ---------- */

describe('splitCommand', () => {
	test('裸 token 分词', () => {
		assert.deepEqual(splitCommand('node server.js --port 8792'), { program: 'node', argv: ['server.js', '--port', '8792'] });
	});
	test('带引号的空格路径整体为一个 token', () => {
		assert.deepEqual(splitCommand('"D:\\soft\\my app.exe" -v'), { program: 'D:\\soft\\my app.exe', argv: ['-v'] });
	});
	test('空命令 → 空 program', () => {
		assert.deepEqual(splitCommand(''), { program: '', argv: [] });
	});
});

/* ---------- 进程名守卫 ---------- */

describe('normalizeImageName', () => {
	test('无扩展名自动补 .exe', () => {
		assert.equal(normalizeImageName('geek'), 'geek.exe');
	});
	test('全小写归一', () => {
		assert.equal(normalizeImageName('Geek.EXE'), 'geek.exe');
	});
	test('空值兜底 .exe', () => {
		assert.equal(normalizeImageName(''), '.exe');
	});
});

/* ---------- pidAlive：信号 0 探活 ---------- */

describe('pidAlive', () => {
	test('当前进程 → 存活', () => {
		assert.equal(pidAlive(process.pid), true);
	});
	test('非法 pid（0/负数/空）→ false', () => {
		assert.equal(pidAlive(0), false);
		assert.equal(pidAlive(-1), false);
		assert.equal(pidAlive(null), false);
		assert.equal(pidAlive(undefined), false);
	});
});

/* ---------- probeUrl：HTTP 应答即存活（自签放行 + 硬超时） ---------- */

describe('probeUrl', () => {
	test('活 HTTP 端点 → true', async () => {
		const srv = http.createServer((_req, res) => res.end('ok'));
		await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
		const addr = srv.address();
		const port = typeof addr === 'object' && addr ? addr.port : 0;
		try {
			assert.equal(await probeUrl(`http://127.0.0.1:${port}/`), true);
		} finally {
			srv.close();
		}
	});
	test('死端口 → false（不抛异常）', async () => {
		// 保留端口 1 上几乎不可能有服务；即便有（极端环境）也不该挂——用短超时兜底
		const r = await probeUrl('http://127.0.0.1:1/', 500);
		assert.equal(typeof r, 'boolean');
		assert.equal(r, false);
	});
	test('非法 URL → false', async () => {
		assert.equal(await probeUrl('not-a-url'), false);
	});
});

/* ---------- store：单根 ~/.ai-scripts 登记册 ---------- */

describe('store（HOME 指向临时目录）', () => {
	const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aispec-'));
	let origHome = '';
	test.before(() => {
		origHome = process.env.HOME ?? "";;
		process.env.HOME = fakeHome; process.env.USERPROFILE = fakeHome;
	});
	test.after(() => {
		process.env.HOME = origHome;
		fs.rmSync(fakeHome, { recursive: true, force: true });
	});

	test('cardsRoot = ~/.ai-scripts', () => {
		assert.equal(cardsRoot(), path.join(fakeHome, '.ai-scripts'));
	});
	test('listScriptIds：只收含 script.json 的目录，忽略点目录与裸目录，排序输出', () => {
		fs.mkdirSync(path.join(cardsRoot(), 'alpha'), { recursive: true });
		fs.writeFileSync(path.join(cardsRoot(), 'alpha', 'script.json'), JSON.stringify({ id: 'alpha', name: 'Alpha' }));
		fs.mkdirSync(path.join(cardsRoot(), '.hidden'), { recursive: true });
		fs.writeFileSync(path.join(cardsRoot(), '.hidden', 'script.json'), '{}');
		fs.mkdirSync(path.join(cardsRoot(), 'empty-dir'), { recursive: true }); // 无 script.json
		assert.deepEqual(listScriptIds(), ['alpha']);
	});
	test('readManifest 容忍多余/历史字段（builtin/order）', () => {
		const m = readManifest('alpha');
		assert.equal(m.name, 'Alpha');
		assert.equal((m as Record<string, unknown>)['builtin'], undefined);
	});
	test('SCRIPT_ID_RE：安全字符白名单', () => {
		assert.equal(SCRIPT_ID_RE.test('alpha-1_X'), true);
		assert.equal(SCRIPT_ID_RE.test('../etc'), false);
		assert.equal(SCRIPT_ID_RE.test('a'.repeat(65)), false);
	});
});

/* ---------- safeJoin：路径穿越防护 ---------- */

describe('safeJoin', () => {
	test('相对路径正常拼接', () => {
		assert.equal(safeJoin('/base', 'a/b.txt'), path.resolve('/base', 'a/b.txt'));
	});
	test('剥前导斜杠（Windows 盘符根陷阱）', () => {
		const p = safeJoin('/base', '/abs/x');
		assert.ok(p.startsWith(path.resolve('/base')));
	});
	test('目录穿越拒绝', () => {
		assert.throws(() => safeJoin('/base', '../escape'));
		assert.throws(() => safeJoin('/base', 'a/../../escape'));
	});
});

/* ---------- 生命周期：startProc → 状态 → stopProc（平台感知） ---------- */

describe('lifecycle', () => {
	const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ailife-'));
	let origHome = '';
	const cardDir = path.join(home, '.ai-scripts', 'sleeper');

	test.before(() => {
		origHome = process.env.HOME ?? "";;
		process.env.HOME = home; process.env.USERPROFILE = home;
		fs.mkdirSync(cardDir, { recursive: true });
		fs.writeFileSync(path.join(cardDir, 'script.json'), JSON.stringify({ id: 'sleeper', name: 'Sleeper', start: 'node -e "setInterval(()=>{},1e9)"' }));
	});
	test.after(async () => {
		// 平台兜底清理：Windows 上 stopProc 已杀；Linux 上 stop 不杀（taskkill 是 Win 专属），手动补刀
		const st = statusOf('sleeper');
		if (st.pid) {
			try { process.kill(st.pid, 'SIGKILL'); } catch { /* 已死 */ }
		}
		process.env.HOME = origHome;
		fs.rmSync(home, { recursive: true, force: true });
	});

	test('startProc：进程存活 + 状态 running + run.json 落盘', async () => {
		const st = startProc('sleeper', 'node -e "setInterval(()=>{},1e9)"', cardDir);
		assert.equal(st.status, 'running');
		assert.ok(st.pid);
		assert.equal(pidAlive(st.pid), true);
		assert.ok(fs.existsSync(path.join(cardDir, '.run.json')));
	});
	test('重复启动 → 拒绝', () => {
		assert.throws(() => startProc('sleeper', 'node -e "0"', cardDir), /已在运行中/);
	});
	test('stopProc：清 run.json；Windows 上进程树被杀，其他平台仅清跟踪', async () => {
		const before = statusOf('sleeper').pid;
		const killed = await stopProc('sleeper');
		assert.equal(killed, true);
		assert.equal(fs.existsSync(path.join(cardDir, '.run.json')), false);
		if (process.platform === 'win32') {
			assert.equal(pidAlive(before), false);
		}
	});
});
