# ai-scripts

脚本卡片控制台——一卡片一目录，放入即注册；目录导入/新建 + 单进程权威管理（宿主重启接管）+ 卡片日志查看 + 卡片网页入口。技术栈：Electron（壳）+ Node/Hono(:8792) + Vue3 + Element Plus + Vite。产物为免安装单 exe（便携版，双击即用）。

## 定位声明

个人桌面工具（卡片登记的是本机软件绝对路径，单机绑定），把「起服务 / 开工具」这类日常重复操作收敛成卡片网格：启动、关闭、看状态（pid / 内存 / 运行时长 / 存活探测）、看日志，一个窗口全办完。

## 布局

- `electron/` — 主进程 `main.cjs`（起服 + 开窗 + 单实例锁 + 卡片播种）；`server.mjs` 为 esbuild 打包产物（勿手改）
- `server/` — Hono 服务源码（routes 卡片 API / store 卡片定位 / procman 进程管理）
- `web/` — Vue3 + Element Plus 前端（构建产物 web/dist）
- `scripts/` — 内置卡片，一卡片一目录（目录 + script.json 即注册）；随包附 `time-tool`（纯静态日程页）作示例
- `build/node-runtime/` — 捆绑的裸 node.exe（卡片运行时，随包分发）
- `release/` — `npm run app:dist` 产物（ai-scripts-portable.exe + win-unpacked/）

## 使用（单 exe 形态）

- **日常**：双击 `ai-scripts-portable.exe` —— 主进程内起 Hono(:8792) 并开控制台窗口；**关窗口 = 应用退出**。单实例锁：重复双击聚焦已有窗口
- **卡片子进程语义**：已启动的卡片不随窗口退（Windows 孤儿进程独立存活），下次打开凭 `.run.json` 接管状态显示；停某张卡片用 UI 上的「关闭」
- **卡片 node 依赖**：包内捆绑 node.exe，procman 启动卡片时自动前插 PATH——目标机器**无需安装 Node**，`node xxx.cjs` 类登记命令照常工作
- **数据路径**：内置卡片首启按目录增量播种到 `%APPDATA%\ai-scripts\scripts`（用户改动持久、包更新只补新卡片）；用户自建/外置卡片在 `~/.ai-scripts/`

## 卡片登记（script.json）

```jsonc
{
	"id": "time-tool",
	"name": "时间工具",
	"desc": "个人日程管理（周/日/月视图，拖选建日程）",
	"start": "explorer index.html",   // 启动命令行，cwd 固定卡片目录
	"transient": true,                // 瞬退豁免：explorer 打开页面类，启动后进程立即退出属预期
	"builtin": true
}
```

可选字段：`open`（运行中显示「打开」按钮）、`check`（URL 存活探测，自签证书也行，适合托管式服务）、`stop`（优雅停止命令，代替杀进程树）、`process`（按进程名探测/强杀，解释器与系统进程名被拒绝）、`order`（排序）。

## 开发

- `npm install` — 装依赖（electron / electron-builder / esbuild 已钉版本）
- `npm run dev` — tsx watch + vite :5175 带 HMR（前后端联调）
- `npm run app` — 构建 web + server bundle 后直接开 Electron 窗口（打包前预览）
- `npm run app:dist` — 出正式便携 exe；server 改动经 `npm run app:bundle`、web 改动经 `npm run build`，两者完成后重打包
- `npm run typecheck` — server(tsc) + web(vue-tsc) 双端类型检查
- 离线构建要点：`electronDist` 直用 `node_modules/electron/dist`（跳过 electron 下载）；electron-builder 的 nsis 工具链缓存一次下载后离线可用

## 性能架构（2026-09-24 重构）

- **探测全异步 + 状态缓存**：卡片列表接口只读缓存（毫秒级返回），存活探测在后台循环做（2.5s 一轮）——pid 用 `process.kill(pid,0)`（零子进程）、URL 用原生 http/https（硬超时）、进程名与内存合并为一次异步 tasklist 快照。历史版本在请求路径里同步 `spawnSync`（tasklist/curl），隐藏控制台链路下子进程偶发不退出会导致宿主整体卡死，已彻底移除
- **启动即停战**：生产宿主 = Electron 主进程内嵌 server 单进程；卡片启动命令一律用构建产物（`node dist/...` 或 `node serve.cjs`），不再用 tsx 现场转译 / vite dev server 当常驻服务
- **启动预检**：卡片启动前探测 check 地址，已可达（旧实例未退）直接 409 明确提示，不再起秒挂的重复实例
- **只绑回环**：服务监听 127.0.0.1——文件读写 API（卡片目录编辑）不暴露局域网
