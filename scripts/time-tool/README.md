# 时间工具（time-tool）

从「拾光」主页日历面板剥离出来的个人时间管理工具。零构建：纯 HTML/CSS/原生 JS，
无框架、无打包、无外部 CDN 依赖（FullCalendar 已本地化），**双击 `index.html` 即可用**，
也可直接部署到 GitHub Pages。

## 功能

- 周区间 / 单日 / 月视图，「所见 = 所选」自定义区间，回今天
- 拖选时段新增日程；拖拽移动 / 拉伸调整（跨零点自动回弹）
- 单击选中、双击 / 右键编辑；**Ctrl+单击多选**
- 多选后：拖拽任一成员**整组平移**（其余成员实时吸附联动）、**Ctrl+V 整组复制到后一天**（连续粘贴递增 +N 天）、**Del 删除**（5 秒内可撤销）
- 快捷键：`T` 今天 · `C` 新建 · `←` `→` 翻时段 · `1/2/3` 单日/周区间/月视图 · `Del` 删除 · `Ctrl+V` 复制 · `Esc` 取消选中 · `D` 深浅色 · `?` 帮助
- 移动端：单日视图、左右滑动翻页、长按拖选创建
- 数据存浏览器 localStorage（自动保存）；支持导出 / 导入 JSON（兼容「拾光」备份文件中的 schedules 数组）

## 部署到 GitHub Pages

1. 把本目录全部文件推到你的 GitHub 仓库根目录。
2. 仓库 Settings → Pages → Source 选分支（如 `main`）+ 根目录 `/ (root)`，保存。
3. 稍等片刻访问 `https://<用户名>.github.io/<仓库名>/`。

## 本地使用

双击 `index.html` 即可（Chrome / Edge / Firefox 均可，无需任何服务）。

## 数据说明

- 数据存于浏览器的 localStorage（key：`canvas_schedules`，与「拾光」同源兼容）。
- **注意**：localStorage 按域名隔离——`file://` 本地打开、GitHub Pages、不同浏览器之间的数据互不相通。跨环境搬家用工具条上的「导出 / 导入」JSON 按钮。
- 导出的 JSON 也可作为备份；导入时兼容「拾光」的备份文件（自动取其 `schedules` 数组，整体替换）。

```
index.html     页面壳 + 弹窗结构
css/theme.css  设计令牌（浅色/深色）
css/app.css    布局 + FullCalendar 主题覆盖 + Element Plus 桥接
vendor/        FullCalendar 6.1.21 全局构建 ×5 + Vue 3.5 全局构建 +
               Element Plus 2.14 全量（含暗色变量与中文语言包）
js/config.js   日历默认值（显示时段、网格密度等，改这里调整）
js/date.js     日期工具
js/colors.js   日程 6 色方案
js/store.js    数据仓库（localStorage 持久化）
js/ui.js       toast / 确认框 / 帮助 / 深浅色
js/calendar.js 日历主逻辑（含 EP 日期选择器的 Vue 桥接）
js/shortcuts.js 快捷键
js/swipe.js    移动端滑动翻页
```
