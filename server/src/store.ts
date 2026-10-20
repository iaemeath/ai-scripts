// 卡片存储 + 数据根 — 一卡片一目录（scripts/<id>/ + script.json），目录即卡片（放入即注册）。
// 登记册模型：script.json 只管登记，唯一机制字段是 start —— 一条命令行。
//   { "name": "智谱额度看板", "start": "node quota-tools.js serve" }
//   { "name": "Geek 卸载器",  "start": "D:\\soft\\geek.exe" }
//   { "name": "时间工具",     "start": "explorer index.html" }   ← 用系统默认程序打开页面
// 启动 = 执行该命令行（cwd 固定为卡片目录，外部程序写绝对路径）；关闭 = 杀进程树。
// 存储根双根：内置 = 仓库 ai-scripts/scripts（完整仓库，随代码迁移）；外置 = ~/.ai-scripts（自装工具的登记卡片，如 geek、cc-switch）。

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ScriptManifest {
	id: string;
	name: string;
	desc?: string;
	/** 启动命令行（cwd 固定为卡片目录；外部程序写绝对路径）。 */
	start?: string;
	/** 打开动作命令行（可选，如 explorer http://localhost:8899/xxx.html）：卡片出现「打开」按钮。 */
	open?: string;
	/** 存活探测 URL（可选，如 https://127.0.0.1:8384）：配置后，即使服务不是控制台拉起的，
	 *  只要该地址可达（自签证书也行）就显示「运行中」——适合 stctl 这类托管式启动器。 */
	check?: string;
	/** 停止命令行（可选）：配置后「关闭」执行它，代替杀进程树——适合守护式服务的优雅停止。 */
	stop?: string;
	/** 进程名探测（可选，如 geek.exe）：配置后，即使不是控制台拉起的，系统里存在该进程即显示
	 *  「运行中」，「关闭」按名强杀——适合手动双击启动的 GUI 工具。解释器/系统进程名（node.exe
	 *  等）一律拒绝，此类工具请改用 check 探测。 */
	process?: string;
	/** 瞬退豁免（可选）：启动后进程立即退出属预期（如 explorer 打开页面类卡片），跳过启动失败判定。 */
	transient?: boolean;
	/** [已废弃] 内置/外置改按卡片所在目录判定（仓库 scripts/=内置，~/.ai-scripts/=外置）。
	 *  字段仍容忍存在但被忽略，仅作历史兼容。 */
	builtin?: boolean;
	order?: number;
}

/* ---------- 卡片目录 ---------- */

/** 卡片根：仓库内置 scripts/（随代码迁移）。 */
export function scriptsRoot(): string {
	// Electron 形态由 main.cjs 注入（打包=userData/scripts 播种副本，dev=仓库 scripts/）；
	// 缺省按源码相对位置解析——dev（server/src，2 级）与打包（electron/，1 级）层级不同，
	// 两个候选取存在者（锚点 = 仓库根 / app 根都必有的 package.json），与 index.ts 的 dist 解析同款
	const injected = process.env.AI_SCRIPTS_SCRIPTS_ROOT;
	if (injected) return injected;
	const here = path.dirname(fileURLToPath(import.meta.url));
	return [path.resolve(here, '../../scripts'), path.resolve(here, '../scripts')].find((p) => fs.existsSync(path.join(p, '..', 'package.json')))
		?? path.resolve(here, '../scripts');
}

/** 外置卡片根：~/.ai-scripts（用户自装工具的登记卡片，与仓库代码分离）。 */
export function externalRoot(): string {
	return path.join(os.homedir(), '.ai-scripts');
}

/** 卡片定位：内置=仓库 scripts/，外置=~/.ai-scripts，按实际位置判定（同 id 两根冲突时内置优先）。 */
export function locateCard(id: string): { dir: string; builtin: boolean } | null {
	const inRepo = path.join(scriptsRoot(), id);
	if (fs.existsSync(path.join(inRepo, 'script.json'))) return { dir: inRepo, builtin: true };
	const inHome = path.join(externalRoot(), id);
	if (fs.existsSync(path.join(inHome, 'script.json'))) return { dir: inHome, builtin: false };
	return null;
}

/** 是否内置卡片（按所在目录判定，与 script.json 的 builtin 字段无关）。 */
export function isBuiltinCard(id: string): boolean {
	return locateCard(id)?.builtin ?? false;
}

/** 卡片目录：已登记的卡片解析其实际所在根；未登记（新建场景）落到外置根——UI 新建的卡片默认外置。 */
export function scriptDir(id: string): string {
	return locateCard(id)?.dir ?? path.join(externalRoot(), id);
}

export function readManifest(id: string): ScriptManifest {
	return JSON.parse(fs.readFileSync(path.join(scriptDir(id), 'script.json'), 'utf8')) as ScriptManifest;
}

export function listScriptIds(): string[] {
	const scan = (root: string): string[] => {
		if (!fs.existsSync(root)) return [];
		return fs.readdirSync(root)
			.filter((n) => {
				const d = path.join(root, n);
				return !n.startsWith('.') && fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, 'script.json'));
			});
	};
	const builtinIds = scan(scriptsRoot());
	const externalIds = scan(externalRoot());
	const seen = new Set(builtinIds); // 同 id 冲突：内置根优先，外置同名目录被遮蔽
	return [...builtinIds, ...externalIds.filter((n) => !seen.has(n))].sort();
}

/** Windows 上 path.resolve(dir, '/x') 会落到盘符根，统一先剥前导斜杠再 resolve，并兜底防穿越。 */
export function safeJoin(dir: string, rel: string): string {
	const clean = String(rel || '').replace(/^[/\\]+/, '');
	const p = path.resolve(dir, clean);
	if (p !== path.resolve(dir) && !p.startsWith(path.resolve(dir) + path.sep)) throw new Error('非法路径');
	return p;
}

export const SCRIPT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
