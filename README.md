# ai-scripts

脚本卡片控制台——目录导入/新建 + 单进程权威管理（detached 常驻 + 宿主重启接管）+ iframe 内嵌脚本页。技术栈：Node + Hono(:8792) + Vue3 + Element Plus + Vite。

## 定位声明

个人桌面工具（卡片登记的是本机软件绝对路径，单机绑定），**不是 zcode 插件、不注册进 ai-tools 市场**，现住 `D:clyai-scripts` 独立目录（2026-09-16 移出 ai-tools 市场——无 AI 侧入口、插件机制零收益；2026-09-17 进一步移出 agent-tools 主仓，此后无 git 跟踪）。

## 布局

- `server/` + `web/` — Hono 服务 + Vue 前端（`npm run dev` 经 concurrently 双起）
- `scripts/` — 内置卡片，一卡片一目录（目录 + script.json 即注册），随代码一起迁移；运行时产物（.run.json / quota_*.json / logs / node_modules）已由 .gitignore 排除
- 卡片根解析：固定 `<仓>/scripts`（按 server 源码位置相对解析，与安装位置无关），无环境变量覆盖

## 启停

- 启动：桌面快捷方式「ai-scripts 启动」（或直接跑 `start.bat`）——起一个最小化终端窗口 `ai-scripts-dev`，服务就绪后自动打开控制台 UI
- 关闭：**关掉那个终端窗口即可**（整条进程链挂在同一控制台上，随窗口一起终止），日常无需关闭脚本
- `stop.bat` 是救援工具：终端窗口丢失或孤儿进程占住 8792/5175 时按端口强杀，不影响已启动的卡片应用

