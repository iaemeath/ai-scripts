<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, FolderOpened, Plus, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '../api';
import type { BrowseResult, LogFileInfo, ScriptCard } from '../types/script';

const route = useRoute();
const router = useRouter();

/** 'list' | 'new' | 'edit' — 卡片列表 + 新建/编辑共用表单（点卡片直接编辑 script.json）。 */
const mode = computed<'list' | 'new' | 'edit'>(() => {
	if (route.name === 'script-new') return 'new';
	if (route.name === 'script-edit') return 'edit';
	return 'list';
});
const editId = computed(() => String(route.params.id ?? ''));

/* ===================== 卡片列表：启动 / 关闭 ===================== */
const cards = ref<ScriptCard[]>([]);
const loading = ref(true);
const now = ref(Date.now());

async function loadCards() {
	try {
		cards.value = await api.listScripts();
		now.value = Date.now();
	} catch {
		/* 轮询失败静默，保留旧数据 */
	} finally {
		loading.value = false;
	}
}

/* ===================== 运行计数（标题旁）：2/3 运行中 ===================== */
const runCount = computed(() => `${cards.value.filter((c) => c.status.status === 'running').length}/${cards.value.length}`);

function statusTagType(s: ScriptCard['status']) {
	return s.status === 'running' ? 'success' : 'info';
}
function statusLabel(s: ScriptCard['status']) {
	if (s.status === 'running') return '运行中';
	if (s.status === 'exited') return '已结束';
	return '未启动';
}
/** 状态徽标悬浮：pid + 运行时长 + 内存占用（按最近一次刷新时刻计）。 */
function statusTip(card: ScriptCard) {
	const s = card.status;
	if (!s.pid) return '';
	const parts = [`PID ${s.pid}`];
	const dur = s.startedAt ? Math.max(0, now.value - s.startedAt) : 0;
	if (dur) parts.push(`已运行 ${fmtDur(dur)}`);
	if (card.memMB) parts.push(`内存 ${card.memMB} MB`);
	return parts.join(' · ');
}
function fmtDur(ms: number) {
	const sec = Math.floor(ms / 1000);
	if (sec >= 86400) return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
	if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
	if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
	return `${sec}s`;
}

/** 正在启动的卡片 id（check 型卡片就绪观察最长 6s，按钮 loading 防重复点击）。 */
const startingId = ref('');

async function start(card: ScriptCard) {
	startingId.value = card.id;
	try {
		const r = await api.startScript(card.id);
		if (r.ok) {
			ElMessage.success(`已启动：${card.name}`);
		} else {
			// 启动失败（观察窗口内进程已退出且 check 不可达）：弹窗展示日志尾部
			ElMessageBox.alert(
				r.logTail || r.reason || '进程已退出',
				`启动失败：${card.name}（${r.reason ?? '进程已退出'}）`,
				{
					confirmButtonText: '知道了',
					customStyle: {
						whiteSpace: 'pre-wrap',
						fontFamily: "Consolas, 'Courier New', monospace",
						fontSize: '12px',
						maxWidth: '680px',
					},
				},
			);
		}
	} catch (e) {
		ElMessage.error((e as Error).message);
	} finally {
		startingId.value = '';
	}
	await loadCards();
}

async function openCard(card: ScriptCard) {
	try {
		await api.openScript(card.id);
		ElMessage.success(`已打开：${card.name}`);
	} catch (e) {
		ElMessage.error((e as Error).message);
	}
}

async function stop(card: ScriptCard) {
	try {
		await api.stopScript(card.id);
		ElMessage.success(`已停止：${card.name}`);
	} catch (e) {
		ElMessage.error((e as Error).message);
	}
	await loadCards();
}

/** 删除卡片：整个卡片目录（含日志）移除；运行中由后端 409 拒绝，前端先行确认。 */
async function removeCard(card: ScriptCard) {
	try {
		await ElMessageBox.confirm(
			`将删除卡片「${card.name}」的整个目录（含 script.json 与日志），不可恢复。`,
			'删除卡片',
			{ confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
		);
	} catch {
		return; // 用户取消
	}
	try {
		await api.deleteScript(card.id);
		ElMessage.success(`已删除：${card.name}`);
	} catch (e) {
		ElMessage.error((e as Error).message);
	}
	await loadCards();
}

/* ===================== 卡片日志：列表 + 尾部查看 ===================== */
const logsDlg = ref(false);
const logsLoading = ref(false);
const logsList = ref<LogFileInfo[]>([]);
const logsCardId = ref('');
const logsCardName = ref('');
/** 当前正在查看的日志（选中即拉尾部，进入弹窗默认自动打开最新一份）。 */
const logView = ref<{ name: string; content: string } | null>(null);
const logLoading = ref(false);

async function openLogs(card: ScriptCard) {
	logsCardId.value = card.id;
	logsCardName.value = card.name;
	logsDlg.value = true;
	logView.value = null;
	await reloadLogs(card.id, true);
}

async function reloadLogs(id: string, autoOpenLatest = false) {
	logsLoading.value = true;
	try {
		logsList.value = await api.listLogs(id);
		if (autoOpenLatest && logsList.value.length) await viewLog(id, logsList.value[0].name);
	} catch (e) {
		ElMessage.error((e as Error).message);
	} finally {
		logsLoading.value = false;
	}
}

async function viewLog(id: string, name: string) {
	logLoading.value = true;
	try {
		logView.value = await api.readLogTail(id, name);
	} catch (e) {
		ElMessage.error((e as Error).message);
	} finally {
		logLoading.value = false;
	}
}

function fmtTime(ms: number) {
	if (!ms) return '—';
	const d = new Date(ms);
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ===================== 新建 / 编辑（共用表单）：名字 / 描述 / 启动命令 / 打开命令 ===================== */
const saving = ref(false);
const form = reactive({ name: '', desc: '', start: '', open: '' });
/** 编辑态保留 json 里未在表单展示的字段（id/order 等），保存时合并写回。 */
let editRaw: Record<string, unknown> | null = null;

function initCreate() {
	form.name = '';
	form.desc = '';
	form.start = '';
	form.open = '';
	editRaw = null;
}

async function loadForEdit() {
	try {
		const f = await api.readCardFile(editId.value, 'script.json');
		const json = JSON.parse(f.content) as Record<string, unknown>;
		editRaw = json;
		form.name = String(json['name'] ?? '');
		form.desc = String(json['desc'] ?? '');
		form.start = String(json['start'] ?? '');
		form.open = String(json['open'] ?? '');
	} catch (e) {
		ElMessage.error((e as Error).message);
		router.push('/scripts');
	}
}

async function save() {
	if (!form.name.trim()) {
		ElMessage.warning('显示名必填');
		return;
	}
	if (!form.start.trim()) {
		ElMessage.warning('启动命令必填');
		return;
	}
	saving.value = true;
	try {
		if (mode.value === 'edit') {
			// 只更新表单字段，json 其余字段（id/order 等）原样保留
			const json = { ...(editRaw ?? { id: editId.value }) };
			json['name'] = form.name.trim();
			json['desc'] = form.desc.trim() || undefined;
			json['start'] = form.start.trim();
			json['open'] = form.open.trim() || undefined;
			await api.writeCardFile(editId.value, 'script.json', JSON.stringify(json, null, '	'));
			ElMessage.success('已保存');
		} else {
			await api.createScript({
				name: form.name.trim(),
				desc: form.desc.trim(),
				start: form.start.trim(),
				open: form.open.trim() || undefined,
			});
			ElMessage.success('卡片已创建');
		}
		router.push('/scripts');
	} catch (e) {
		ElMessage.error((e as Error).message);
	} finally {
		saving.value = false;
	}
}

/* ---- 命令路径浏览选择器（服务端列目录，浏览器拿不到本地绝对路径） ---- */
const browseDlg = ref(false);
const browsing = ref(false);
const browse = ref<BrowseResult>({ path: '', parent: null, dirs: [], files: [] });
const browseInput = ref('');

async function openBrowse() {
	browseDlg.value = true;
	await browseTo('');
}
async function browseTo(path: string) {
	browsing.value = true;
	try {
		browse.value = await api.browse(path || undefined);
		browseInput.value = browse.value.path;
	} catch (e) {
		ElMessage.error((e as Error).message);
	} finally {
		browsing.value = false;
	}
}
function pickExe(file: string) {
	form.start = `${browse.value.path}\\${file}`;
	browseDlg.value = false;
}

/* ===================== 模式切换：进入列表扫描一次；进表单按模式初始化 ===================== */
watch(
	mode,
	(m) => {
		if (m === 'list') loadCards();
		if (m === 'new') initCreate();
		if (m === 'edit') loadForEdit();
	},
		{ immediate: true },
	);

/* ===================== 运行一览实时化：5s 轮询（列表页 + 页面可见才刷，回前台立即刷） ===================== */
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling() {
	stopPolling();
	pollTimer = setInterval(() => {
		if (mode.value === 'list' && document.visibilityState === 'visible') loadCards();
	}, 5000);
}
function stopPolling() {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}
function onVisibilityChange() {
	if (document.visibilityState === 'visible' && mode.value === 'list') loadCards();
}
onMounted(() => {
	document.addEventListener('visibilitychange', onVisibilityChange);
	startPolling();
});
onUnmounted(() => {
	document.removeEventListener('visibilitychange', onVisibilityChange);
	stopPolling();
});

const rootHint = computed(() => '工具目录 ~/.ai-scripts · 一卡片一目录，放入即注册');
</script>

<template>
  <!-- ============ 卡片列表 ============ -->
  <div v-if="mode === 'list'" v-loading="loading" class="scripts-view">
    <div class="toolbar">
      <span class="hint">{{ rootHint }}</span>
      <div class="spacer" />
      <el-button :icon="Refresh" @click="loadCards">刷新</el-button>
      <el-button type="primary" :icon="Plus" @click="router.push('/scripts/new')">新建</el-button>
    </div>

    <el-empty v-if="!loading && cards.length === 0" description="还没有卡片">
      <div class="empty-sub">点击「新建」登记工具；把含 script.json 的目录放入 ~/.ai-scripts，5 秒内自动注册</div>
    </el-empty>

    <div v-else class="sections">
      <div class="group-head">
        <span class="group-name">全部工具</span>
        <span class="group-count">{{ cards.length }} 张 · 运行 {{ runCount }}</span>
      </div>
      <div class="card-grid">
        <el-card v-for="s in cards" :key="s.id" class="script-card" shadow="hover">
          <div class="card-head">
            <span class="card-name">{{ s.name }}</span>
            <el-tooltip :content="statusTip(s)" :disabled="!statusTip(s)" placement="top">
              <el-tag size="small" :type="statusTagType(s.status)" disable-transitions>{{ statusLabel(s.status) }}</el-tag>
            </el-tooltip>
          </div>
          <div class="card-desc">{{ s.desc || '（无描述）' }}</div>
          <div class="card-cmd mono">{{ s.start }}</div>
          <div class="card-meta">
            <el-tag v-if="s.status.status === 'running' && s.memMB" size="small" type="success" effect="plain" disable-transitions>
              {{ s.memMB }} MB
            </el-tag>
          </div>
          <div class="card-ops">
            <el-button size="small" type="success" plain :loading="startingId === s.id" :disabled="s.status.status === 'running'" @click="start(s)">启动</el-button>
            <el-button v-if="s.open && s.status.status === 'running'" size="small" type="primary" plain @click="openCard(s)">打开</el-button>
            <el-button size="small" type="danger" plain :disabled="s.status.status !== 'running'" @click="stop(s)">关闭</el-button>
            <el-button size="small" text @click="openLogs(s)">日志</el-button>
            <el-button size="small" text @click="router.push(`/scripts/${encodeURIComponent(s.id)}/edit`)">编辑</el-button>
            <el-button size="small" text type="danger" :disabled="s.status.status === 'running'" @click="removeCard(s)">删除</el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>

  <!-- ============ 新建 / 编辑（共用表单） ============ -->
  <div v-else class="scripts-view">
    <div class="toolbar">
      <el-button :icon="ArrowLeft" @click="router.push('/scripts')">返回</el-button>
      <h2 class="page-title">{{ mode === 'edit' ? '编辑卡片' : '新建卡片' }}</h2>
    </div>

    <div class="create-form">
      <div class="form-item">
        <label class="form-label">显示名</label>
        <el-input v-model="form.name" placeholder="如：Geek 卸载器" maxlength="40" />
      </div>
      <div class="form-item">
        <label class="form-label">描述</label>
        <el-input v-model="form.desc" type="textarea" :rows="2" maxlength="200" />
      </div>
      <div class="form-item">
        <label class="form-label">启动命令</label>
        <div class="import-row">
          <el-input v-model="form.start" placeholder='D:\soft\geek.exe 或 node server.js 或 explorer index.html' class="mono" />
          <el-button :icon="FolderOpened" @click="openBrowse">浏览</el-button>
        </div>
        <div class="form-hint">任意命令行；相对路径基于卡片目录解析，外部程序写绝对路径（可带引号）</div>
      </div>
      <div class="form-item">
        <label class="form-label">打开命令（可选）</label>
        <div class="import-row">
          <el-input v-model="form.open" placeholder="explorer http://localhost:8899/quota-dashboard.html" class="mono" />
        </div>
        <div class="form-hint">配置后，卡片「运行中」时出现「打开」按钮，用于打开工具自带的页面/界面</div>
      </div>

      <div class="form-actions">
        <el-button @click="router.push('/scripts')">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ mode === 'edit' ? '保存' : '创建' }}</el-button>
      </div>
    </div>

    <!-- 命令路径浏览选择器 -->
    <el-dialog v-model="browseDlg" title="选择 exe（填入启动命令）" width="560px">
      <div v-loading="browsing" class="browse-body">
        <div class="import-row" style="margin-bottom: 8px">
          <el-input v-model="browseInput" placeholder="输入目录路径后回车" class="mono" @keyup.enter="browseTo(browseInput)" />
          <el-button :disabled="!browse.parent" @click="browseTo(browse.parent ?? '')">上级</el-button>
        </div>
        <div class="browse-list">
          <div v-for="d in browse.dirs" :key="d" class="browse-row" @click="browseTo(`${browse.path}\\${d}`)">
            <span class="browse-icon">📁</span><span>{{ d }}</span>
          </div>
          <div v-for="f in browse.files" :key="f" class="browse-row file" @click="pickExe(f)">
            <span class="browse-icon">⚙️</span><span>{{ f }}</span>
          </div>
          <div v-if="!browse.dirs.length && !browse.files.length" class="browse-empty">（空目录）</div>
        </div>
      </div>
    </el-dialog>

    <!-- 卡片日志：列表（新→旧）+ 尾部查看 -->
    <el-dialog v-model="logsDlg" :title="`日志 — ${logsCardName}`" width="720px" top="6vh">
      <div v-loading="logsLoading" class="logs-body">
        <div class="logs-toolbar">
          <span class="logs-hint">保留最近 10 份，点击查看尾部（约 4KB）</span>
          <el-button size="small" :icon="Refresh" :disabled="!logsCardId" @click="reloadLogs(logsCardId)">刷新</el-button>
        </div>
        <div class="logs-list">
          <div
            v-for="l in logsList"
            :key="l.name"
            class="logs-row"
            :class="{ active: logView?.name === l.name }"
            @click="viewLog(logsCardId, l.name)"
          >
            <span class="logs-name mono">{{ l.name }}</span>
            <span class="logs-meta">{{ fmtTime(l.mtime) }} · {{ l.sizeKB }} KB</span>
          </div>
          <div v-if="!logsLoading && !logsList.length" class="browse-empty">（无日志——卡片从未启动过）</div>
        </div>
        <div v-if="logView" v-loading="logLoading" class="log-view">
          <div class="log-view-head mono">{{ logView.name }}</div>
          <pre class="log-content mono">{{ logView.content }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.scripts-view {
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.spacer {
  flex: 1;
}
.hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.mono {
  font-family: Consolas, 'Courier New', monospace;
}
.empty-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.page-title {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

/* ---- 卡片 ---- */
.sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.group-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.group-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.group-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.card-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.card-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  margin: 8px 0;
  min-height: 38px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-cmd {
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-dark);
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 8px;
  word-break: break-all;
}
.card-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  min-height: 0;
}
.card-ops {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 10px;
  min-height: 46px;
}

/* ---- 新建表单 ---- */
.create-form {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  font-weight: 600;
}
.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: -4px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.import-row {
  display: flex;
  gap: 8px;
}

/* ---- 浏览选择器 ---- */
.browse-body {
  min-height: 260px;
}
.browse-list {
  max-height: 40vh;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}
.browse-row {
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}
.browse-row:hover {
  background: var(--el-fill-color-light);
}
.browse-row.file {
  color: var(--el-color-primary);
}
.browse-empty {
  padding: 16px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-align: center;
}
.browse-icon {
  flex: 0 0 auto;
}

/* ---- 卡片日志弹窗 ---- */
.logs-body {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.logs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.logs-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.logs-list {
  max-height: 22vh;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}
.logs-row {
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  font-size: 13px;
}
.logs-row:hover {
  background: var(--el-fill-color-light);
}
.logs-row.active {
  background: var(--el-color-primary-light-9);
}
.logs-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.logs-meta {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.log-view-head {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.log-content {
  margin: 0;
  padding: 10px;
  background: var(--el-fill-color-dark);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  max-height: 42vh;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
