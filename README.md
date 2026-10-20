# ai-scripts

脚本卡片控制台——目录导入/新建 + 单进程权威管理（宿主重启接管）+ 卡片网页入口。技术栈：Electron（壳）+ Node/Hono(:8792) + Vue3 + Element Plus + Vite。

## 定位声明

个人桌面工具（卡片登记的是本机软件绝对路径，单机绑定），**不是 zcode 插件、不注册进 ai-tools 市场**，现住 `D:\cly\ai-scripts` 独立目录（2026-09-16 移出 ai-tools 市场——无 AI 侧入口、插件机制零收益；2026-09-17 进一步移出 agent-tools 主仓，此后无 git 跟踪）。

**2026-10-19 收敛为 Electron 单 exe 单形态**：旧 host.vbs / start.bat / stop.bat 链路及桌面快捷方式已删除，双击 `release\ai-scripts-portable.exe` 即全部。

## 布局

- `electron/` — 主进程 `main.cjs`（起服 + 开窗 + 单实例锁 + 卡片播种）；`server.mjs` 为 esbuild 打包产物（勿手改）
- `server/` — Hono 服务源码（routes 卡片 API / store 卡片定位 / procman 进程管理）
- `web/` — Vue3 + Element Plus 前端（构建产物 web/dist）
- `scripts/` — 内置卡片，一卡片一目录（目录 + script.json 即注册）
- `build/node-runtime/` — 捆绑的裸 node.exe（卡片运行时，随包分发）
- `release/` — `npm run app:dist` 产物（ai-scripts-portable.exe + win-unpacked/）

## 使用（单 exe 形态）

- **日常**：双击 `release\ai-scripts-portable.exe` —— 主进程内起 Hono(:8792) 并开控制台窗口；**关窗口 = 应用退出**。单实例锁：重复双击聚焦已有窗口
- **卡片子进程语义**：已启动的卡片不随窗口退（Windows 孤儿进程独立存活），下次打开凭 `.run.json` 接管状态显示；停某张卡片用 UI 上的「关闭」
- **卡片 node 依赖**：包内捆绑 node.exe，procman 启动卡片时自动前插 PATH——目标机器**无需安装 Node**，`node xxx.cjs` 类登记命令照常工作
- **数据路径**：内置卡片首启按目录增量播种到 `%APPDATA%\ai-scripts\scripts`（用户改动持久、包更新只补新卡片）；用户自建/外置卡片在 `~/.ai-scripts/`
- ⚠️ **quota-dashboard 卡片内含 apikeys.json（密钥）——exe 不要外发给他人**

## 开发

- `npm run dev` — tsx watch + vite :5175 带 HMR（前后端联调）
- `npm run app` — 构建 web + server bundle 后直接开 Electron 窗口（打包前预览）
- `npm run app:dist` — 出正式便携 exe；server 改动经 `npm run app:bundle`、web 改动经 `npm run build`，两者完成后重打包
- `npm run typecheck` — server(tsc) + web(vue-tsc) 双端类型检查
- 首次构建离线要点：electron 43.4.1 / electron-builder 26.15.3 / esbuild 0.28.2 已钉版本走内网 Nexus；electron 二进制与 nsis 工具链缓存均已在本机（`%LOCALAPPDATA%` 下），无需外网

## 性能架构（2026-09-24 重构）

- **探测全异步 + 状态缓存**：卡片列表接口只读缓存（毫秒级返回），存活探测在后台循环做（2.5s 一轮）——pid 用 `process.kill(pid,0)`（零子进程）、URL 用原生 http/https（硬超时）、进程名与内存合并为一次异步 tasklist 快照。历史版本在请求路径里同步 `spawnSync`（tasklist/curl），隐藏控制台链路下子进程偶发不退出会导致宿主整体卡死，已彻底移除
- **启动即停战**：生产宿主 = Electron 主进程内嵌 server 单进程；卡片启动命令一律用构建产物（`node dist/...` 或 `node serve.cjs`），不再用 tsx 现场转译 / vite dev server 当常驻服务
- **启动预检**：卡片启动前探测 check 地址，已可达（旧实例未退）直接 409 明确提示，不再起秒挂的重复实例
