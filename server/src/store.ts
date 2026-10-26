// 卡片存储 + 数据根 — 一卡片一目录（~/.ai-scripts/<id>/ + script.json），目录即卡片（放入即注册）。
// 登记册模型：script.json 只管登记，唯一机制字段是 start —— 一条命令行。
//   { "name": "智谱额度看板", "start": "node quota-tools.js serve" }
//   { "name": "Geek 卸载器",  "start": "D:\\soft\\geek.exe" }
//   { "name": "时间工具",     "start": "explorer index.html" }   ← 用系统默认程序打开页面
// 启动 = 执行该命令行（cwd 固定为卡片目录，外部程序写绝对路径）；关闭 = 杀进程树。
// 存储根单根：~/.ai-scripts（2026-10-22 起废除内置/外置双根——卡片全部走用户目录，见 main.cjs 的一次性迁移）。

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
	/** 进程名探测（可选，单名或数组）：任一存在于系统即显示「运行中」，「关闭」按名强杀兜底——
	 *  适合手动双击启动的 GUI 工具，或一卡片拉起多个应用（数组任一存活即亮运行灯）。
	 *  解释器/系统进程名（node.exe 等）一律拒绝，此类工具请改用 check 探测。 */
	process?: string | string[];
	/** 瞬退豁免（可选）：启动后进程立即退出属预期（如 explorer 打开页面类卡片），跳过启动失败判定。 */
	transient?: boolean;
	/** [已废弃] 内置/外置双根已废除，卡片一律在 ~/.ai-scripts。字段容忍存在但被忽略。 */
	builtin?: boolean;
	/** [已废弃] 仅历史兼容，忽略。 */
	order?: number;
}

/* ---------- 卡片目录 ---------- */

/** 卡片根（唯一）：~/.ai-scripts。 */
export function cardsRoot(): string {
	return path.join(os.homedir(), '.ai-scripts');
}

/** 卡片目录：<根>/<id>。 */
export function scriptDir(id: string): string {
	return path.join(cardsRoot(), id);
}

export function readManifest(id: string): ScriptManifest {
	return JSON.parse(fs.readFileSync(path.join(scriptDir(id), 'script.json'), 'utf8')) as ScriptManifest;
}

/** process 字段归一化：单名/数组双形态 → 去空白去空项的名单（与 Rust 版 process_names 对齐）。 */
export function normalizeProcess(p: string | string[] | undefined): string[] {
	if (!p) return [];
	const list = Array.isArray(p) ? p : [p];
	return list.map((s) => s.trim()).filter((s) => s !== '');
}

export function listScriptIds(): string[] {
	const root = cardsRoot();
	if (!fs.existsSync(root)) return [];
	return fs.readdirSync(root)
		.filter((n) => {
			const d = path.join(root, n);
			return !n.startsWith('.') && fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, 'script.json'));
		})
		.sort();
}

/** Windows 上 path.resolve(dir, '/x') 会落到盘符根，统一先剥前导斜杠再 resolve，并兜底防穿越。 */
export function safeJoin(dir: string, rel: string): string {
	const clean = String(rel || '').replace(/^[/\\]+/, '');
	const p = path.resolve(dir, clean);
	if (p !== path.resolve(dir) && !p.startsWith(path.resolve(dir) + path.sep)) throw new Error('非法路径');
	return p;
}

export const SCRIPT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
