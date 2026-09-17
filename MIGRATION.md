# ai-scripts 迁移方案（自 ai-tools/claude-code-config-ui 拆出）

> 2026-09-15 定稿。源仓：`D:\cly\claude-code-config-ui`（scripts 模块 + 相关 web 资产）。
> 定位：**脚本卡片控制台 —— 目录导入/新建 + 单进程权威管理（detached 常驻 + 宿主重启接管）+ iframe 内嵌脚本页**。
> 耦合评估结论：三模块中最干净，出向依赖仅 `data-dir.ts` 一项，可先行独立。

## 1. 目标形态

| 项 | 决定 |
|---|---|
| 数据根 | `~/.ai-scripts/`（`scripts/` 卡片目录树），首启从 `~/.ai-tools/scripts` 按 moveLegacy 模式一次性搬迁；`CCC_SCRIPTS_DIR` 环境变量覆盖保留 |
| 依赖面 | 不碰 SSH/X-Host/hosts（现状即如此）；web 端无 host/tool 选择器 |
| 技术栈 | 维持 Node + Hono + tsx 直跑 + hono/proxy（脚本页代理）；web 维持 Vue3 + Element Plus + Vite。端口建议 8792 |
| 仓库形态 | 单包（`server/` + `web/` + 根 package.json，dev 用 concurrently），`git init` 起新历史 |

## 2. 服务端迁移清单（源 `server/src/`）

| 文件 | 动作 | 说明 |
|---|---|---|
| `scripts/store.ts` | **拷贝 + 改根** | `scriptsRoot()` 默认 `<dataRoot>/scripts`；manifest（entry/单目录一卡片）逻辑原样 |
| `scripts/procman.ts` | **原样拷贝** | 单进程权威管理（startProc/statusOf/stopProc/alive/detached 接管），自包含 |
| `routes/scripts.ts` | **拷贝** | 含 `hono/proxy` 内嵌脚本页代理与 `/scripts-pages` 静态路由；路由前缀改本仓约定（如 `/api/scripts` 保持不变，零前端改动） |
| `data-dir.ts` | **拷贝 + 改根** | `dataRoot()` → `~/.ai-scripts`；legacy 搬迁项：`~/.ai-tools/scripts` |
| `web-assets.ts`（脚本页静态服务所需部分） | 按需拷贝 | 若脚本页走 vite dev 代理 + exe 内嵌资产，抄 SEA 资产读取最小实现；纯 dev 阶段可后置 |

## 3. web 端迁移清单（源 `web/src/`）

| 文件 | 动作 |
|---|---|
| `views/ScriptsView.vue`、`views/ScriptDetailView.vue` | 拷贝 |
| `types/script.ts` | 拷贝 |
| `api` | 只抽 scripts 端点为独立 `api.ts`（去 injectHost） |
| 壳 | 新写极简壳（无 host/tool、无 caselog 入口）；路由 `/`（卡片墙）+ `/scripts/:id`（详情/控制台）；i18n 只保留 `scripts.*` 键 |
| 复用件 | 若详情页用到 `SplitPane`/`layout.css`，从源仓一并拷贝副本 |

## 4. 源仓收尾（scripts 移除，单独一个 commit）

- 删：`server/src/scripts/`、`server/src/routes/scripts.ts`、`web/src/views/{ScriptsView,ScriptDetailView}.vue`、`web/src/types/script.ts`、api scripts 段、i18n `scripts.*` 键、侧栏"脚本"组、`router` 两条路由、`index.ts` 挂载。
- `remote/` 无牵连（scripts 从未使用远端执行）；`data-dir.ts` 在主仓仍服务 hosts 注册表，保留。

## 5. 验收基线

1. 首启完成 `~/.ai-scripts` 搬迁，既有卡片（含 script.json manifest）全部可见可运行。
2. 新建/目录导入/启停/状态/控制台输出与拆分前一致；宿主重启后 detached 进程接管正常。
3. iframe 内嵌脚本页在 dev（vite 代理）与打包（SEA 资产）两种形态下均可打开。
4. 全仓 grep 无 `procman`/`scriptsRoot` 残留引用于源仓；源仓 typecheck 通过。
