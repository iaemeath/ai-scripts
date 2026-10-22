// Script (卡片) domain types — 登记册模型：script.json 只管登记（名字/描述/一条启动命令行），
// 启动 = 执行该命令行（cwd 固定卡片目录），关闭 = 杀进程树。

export type ScriptEntryStatus = 'idle' | 'running' | 'exited';

export interface ScriptProcState {
	status: ScriptEntryStatus;
	pid: number | null;
	startedAt: number | null;
}

export interface ScriptCard {
	id: string;
	name: string;
	desc?: string;
	/** 启动命令行（登记原文）。 */
	start: string;
	/** 打开动作命令行（可选）：出现「打开」按钮。 */
	open?: string;
	/** 该卡片唯一进程的实时状态。 */
	status: ScriptProcState;
	/** 运行中进程的内存占用（MB）。 */
	memMB?: number;
}

export interface ScriptCreateInput {
	name: string;
	desc?: string;
	start: string;
	/** 打开动作命令行（可选）。 */
	open?: string;
	order?: number;
}

/** 命令路径浏览选择器的一次目录读取。 */
export interface BrowseResult {
	path: string;
	parent: string | null;
	dirs: string[];
	files: string[];
}

/** 卡片日志目录里的一份日志（logs/<时间戳>.log，新→旧排列）。 */
export interface LogFileInfo {
	name: string;
	/** 文件大小（KB，向上取整，最小 1）。 */
	sizeKB: number;
	/** 修改时间（epoch ms）。 */
	mtime: number;
}

/** 一份日志的尾部内容。 */
export interface LogTail {
	name: string;
	content: string;
}
