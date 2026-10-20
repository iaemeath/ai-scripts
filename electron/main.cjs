// ai-scripts Electron 主进程 — Hono 服务跑在主进程内，窗口加载 http://localhost:8792。
// 生命周期：exe 启动 = 起服务 + 开窗口；关窗口 = app.quit()（卡片进程是 Windows 独立
// 孤儿，不随宿主退，与仓库「卡片常驻」语义一致；重启后凭 .run.json 接管）。
// 单实例：重复双击聚焦已有窗口。构建：npm run app:dist → release/ai-scripts-portable.exe。
//
// 用 CJS（.cjs）：asar 内 ESM 加载链解析 bare specifier 'electron' 时会穿透到真实文件
// 系统的 node_modules（仓库里恰有 npm electron 包，导出的是路径字符串），拿不到内置
// 模块（实测 named/default 全废）；CJS 的 require('electron') 由 electron 运行时优先
// 接管内置模块，无歧义。
//
// 路径注入（server bundle 读）：
//   AI_SCRIPTS_SCRIPTS_ROOT — 内置卡片根：打包态指向 userData/scripts（resources 每次启动
//                             便携解包到临时目录，写入会丢；首启按卡片增量播种过去，用户
//                             改动持久）；dev 态指仓库 scripts/
//   AI_SCRIPTS_WEB_DIST     — dev 态指仓库 web/dist（打包态 bundle 在 asar/electron/ 内，
//                             相对解析 ../web/dist 天然正确，无需注入）

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const here = __dirname;

/* ---------- 启动轨迹（诊断用）：写到 ~/ai-scripts-boot.log，每阶段打点 ---------- */
const TRACE = path.join(os.homedir(), 'ai-scripts-boot.log');
function trace(msg) {
	try {
		fs.appendFileSync(TRACE, `${new Date().toISOString()} ${msg}\n`);
	} catch {
		/* 尽力而为 */
	}
}
process.on('uncaughtException', (e) => trace('UNCAUGHT ' + ((e && e.stack) || e)));
process.on('exit', (code) => trace(`EXIT code=${code}`));

trace('T0 main.cjs entered (hw=' + (process.env.ELECTRON_RUN_AS_NODE ? 'node-mode!' : 'electron-mode') + ')');
let electron;
try {
	electron = require('electron');
} catch (e) {
	trace('T1 FAIL require electron: ' + e.message);
	throw e;
}
trace('T1 electron module: ' + typeof electron);
const { app, BrowserWindow, dialog, shell } = electron;
app.disableHardwareAcceleration(); // 核显/驱动差异下 GPU 初始化崩溃的规避；表单类 UI 无损
trace('T2 disableHardwareAcceleration set');

/** 打包态播种内置卡片：resources/scripts → userData/scripts，按卡片目录增量
 *  （已存在的不动，保留用户修改与 logs/.run.json 等运行时产物；新卡片随更新补齐）。 */
function seedBuiltinCards() {
	const src = path.join(process.resourcesPath, 'scripts');
	const dst = path.join(app.getPath('userData'), 'scripts');
	if (!fs.existsSync(src)) return dst;
	fs.mkdirSync(dst, { recursive: true });
	for (const name of fs.readdirSync(src)) {
		const from = path.join(src, name);
		const to = path.join(dst, name);
		if (!fs.existsSync(path.join(from, 'script.json'))) continue; // 只播种卡片目录
		if (fs.existsSync(to)) continue;
		fs.cpSync(from, to, { recursive: true });
	}
	return dst;
}

function createWindow() {
	let win = new BrowserWindow({
		width: 1280,
		height: 860,
		show: false,
		autoHideMenuBar: true,
		backgroundColor: '#f5f7fa',
		title: 'ai-scripts',
		webPreferences: { contextIsolation: true, sandbox: true },
	});
	win.once('ready-to-show', () => {
		trace('T8 window ready-to-show -> show');
		win?.show();
	});
	win.webContents.on('render-process-gone', (_e, details) => trace('RENDERER GONE: ' + details.reason));
	// 非 8792 的外链（卡片「打开」动作等）交给系统默认程序
	win.webContents.setWindowOpenHandler(({ url }) => {
		const internal = url.startsWith('http://localhost:8792');
		if (!internal) void shell.openExternal(url);
		return { action: internal ? 'allow' : 'deny' };
	});
	win.on('closed', () => {
		win = null;
	});
	void win.loadURL('http://localhost:8792');
}

if (!app.requestSingleInstanceLock()) {
	trace('T3 lock: NOT primary -> quit');
	app.quit(); // 已有实例在跑：本进程直接退，second-instance 那边负责聚焦窗口
} else {
	trace('T3 lock acquired');
	app.on('second-instance', () => {
		const win = BrowserWindow.getAllWindows()[0];
		if (!win) return;
		if (win.isMinimized()) win.restore();
		win.focus();
	});

	// 关窗即退：全平台一致（个人 Windows 工具，不做 macOS 托底常驻）
	app.on('window-all-closed', () => app.quit());

	app.whenReady().then(async () => {
		trace('T4 app ready');
		process.env.AI_SCRIPTS_EMBEDDED = '1';
		if (app.isPackaged) {
			process.env.AI_SCRIPTS_SCRIPTS_ROOT = seedBuiltinCards();
			// 捆绑的卡片运行时：procman 把它前插进卡片进程 PATH（没装 Node 的机器也能跑卡片）
			const nodeRuntime = path.join(process.resourcesPath, 'node-runtime');
			if (fs.existsSync(path.join(nodeRuntime, 'node.exe'))) {
				process.env.AI_SCRIPTS_NODE_DIR = nodeRuntime;
			}
		} else {
			process.env.AI_SCRIPTS_SCRIPTS_ROOT = path.resolve(here, '../scripts');
			process.env.AI_SCRIPTS_WEB_DIST = path.resolve(here, '../web/dist');
		}
		try {
			const { startServer } = await import('./server.mjs');
			await startServer();
			trace('T5 server up on 8792');
		} catch (e) {
			trace('T5 FAIL server: ' + e.message);
			dialog.showErrorBox('ai-scripts', `服务启动失败（端口 8792 被占用？）\n${e.message}\n\n多为旧实例仍在运行：任务管理器结束 ai-scripts.exe（或 8792 端口的 node.exe）后重试。`);
			app.quit();
			return;
		}
		trace('T6 creating window');
		createWindow();
	});
}
