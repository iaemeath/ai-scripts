<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <a-tab-pane key="batch" tab="批次管理">
        <div class="tab-inner">
          <div class="action-bar">
            <a-space>
              <a-button type="primary" @click="onOpenCreate">新建批次</a-button>
              <a-button @click="loadBatches">刷新</a-button>
            </a-space>
            <a-space split>
              <a-statistic title="总批次" :value="batchStats.total" />
              <a-statistic title="完成" :value="batchStats.done" :value-style="{ color: '#52c41a' }" />
              <a-statistic title="执行中" :value="batchStats.running" />
              <a-statistic title="失败" :value="batchStats.failed" :value-style="{ color: '#ff4d4f' }" />
            </a-space>
          </div>

          <a-table :columns="batchColumns" :data-source="batchList" :loading="batchLoading" :scroll="{ x: 1400 }" :pagination="{ pageSize: 10, showSizeChanger: true }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'batchNo'">
                <a @click="onViewDetail(record)">{{ record.batchNo }}</a>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="batchTagColor(record.status)">{{ batchLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'progress'">
                <a-progress :percent="progressPercent(record)" size="small"
                            :status="progressStatus(record)" />
              </template>
              <template v-else-if="column.dataIndex === 'successFail'">
                <span style="color: #52c41a">{{ record.successCount || 0 }}</span>
                /
                <span style="color: #ff4d4f">{{ record.failCount || 0 }}</span>
                / {{ record.totalCount || 0 }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" :disabled="!canExecute(record.status)" @click="onExecute(record)">执行</a-button>
                <a-button type="link" size="small" :disabled="!canCancel(record.status)" danger @click="onCancel(record)">取消</a-button>
                <a-button type="link" size="small" @click="onViewDetail(record)">明细</a-button>
                <a-button type="link" size="small" :loading="exportingBatchId === record.id" @click="onExport(record)">导出</a-button>
                <a-button v-if="record.failCount > 0" type="link" size="small" :loading="retryingBatchId === record.id" @click="onRetryFailed(record)">重试失败项</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="feedback" tab="上报反馈">
        <div class="tab-inner">
          <a-row :gutter="16" style="margin-bottom: 16px">
            <a-col :span="6"><a-card><a-statistic title="总批次数" :value="stats.totalBatches || 0" /></a-card></a-col>
            <a-col :span="6"><a-card><a-statistic title="成功批次" :value="stats.successBatches || 0" :value-style="{ color: '#52c41a' }" /></a-card></a-col>
            <a-col :span="6"><a-card><a-statistic title="失败批次" :value="stats.failBatches || 0" :value-style="{ color: '#ff4d4f' }" /></a-card></a-col>
            <a-col :span="6"><a-card><a-statistic title="成功率" :value="stats.successRate || 0" suffix="%" :precision="2" /></a-card></a-col>
          </a-row>
          <a-button @click="loadFeedback" style="margin-bottom: 12px">刷新反馈列表</a-button>
          <a-table :columns="feedbackColumns" :data-source="feedbackList" :loading="feedbackLoading" :scroll="{ x: 850 }" :pagination="{ pageSize: 10 }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'successRatio'">
                <a-progress :percent="Number(record.successRatio) || 0" size="small"
                            :status="(Number(record.failCount) || 0) > 0 ? 'exception' : 'success'" />
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="showCreate" title="新建上报批次" width="720px" @ok="onCreate" :confirm-loading="creating">
      <a-form layout="vertical">
        <a-form-item label="关联模板" name="templateId" required>
          <a-select v-model:value="createReq.templateId" :options="tplOptions" :field-names="{label:'templateName',value:'id'}" show-search placeholder="请选择" />
        </a-form-item>
        <a-form-item label="目标系统" name="targetSystem">
          <a-input v-model:value="createReq.targetSystem" placeholder="默认 PROVINCIAL_EMS" />
        </a-form-item>
        <a-form-item label="台账 ID 列表(可选,逗号分隔;留空表示全部已归档台账)" name="ledgerIdsText">
          <a-textarea v-model:value="createReq.ledgerIdsText" :rows="3" placeholder="留空自动取 ARCHIVED 状态台账" />
        </a-form-item>
        <a-space style="margin-bottom: 12px">
          <a-button :loading="previewing" @click="onPreviewAssemble">预览组装</a-button>
          <span v-if="assemblePreview" style="color: #888">有效 {{ assemblePreview.validCount }} / 总 {{ assemblePreview.totalCount }}<span v-if="assemblePreview.skipped && assemblePreview.skipped.length"> / 跳过 {{ assemblePreview.skipped.length }}</span></span>
        </a-space>
        <a-alert v-if="assemblePreview && assemblePreview.skipped && assemblePreview.skipped.length" type="warning" show-icon style="margin-bottom: 12px"
          :message="`以下 ${assemblePreview.skipped.length} 条台账因必填项缺失将被剔除(确认创建批次时不包含这些)`"
          :description="assemblePreview.skipped.map((s: any) => s.deviceName || s.ledgerId).join('、 ')" />
      </a-form>
    </a-modal>

    <a-drawer v-model:open="showDetail" :title="`批次明细 - ${currentBatch?.batchNo || ''}`" width="900px">
      <a-descriptions :column="3" bordered size="small" style="margin-bottom: 16px">
        <a-descriptions-item label="状态">
          <a-tag :color="batchTagColor(currentBatch?.status)">{{ batchLabel(currentBatch?.status) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="总数">{{ currentBatch?.totalCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="成功">
          <span style="color: #52c41a">{{ currentBatch?.successCount || 0 }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="失败">
          <span style="color: #ff4d4f">{{ currentBatch?.failCount || 0 }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="进度">
          <a-progress :percent="batchPercent(currentBatch)" :status="batchProgressStatus(currentBatch)" />
        </a-descriptions-item>
        <a-descriptions-item label="触发时间">{{ currentBatch?.triggerTime }}</a-descriptions-item>
      </a-descriptions>
      <a-table :columns="detailColumns" :data-source="detailList" :loading="detailLoading" :scroll="{ x: 1080 }" row-key="id" size="small" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="detailTagColor(record.status)">{{ detailStatusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'responseMsg'">
            <a-tooltip :title="record.responseMsg">
              <span :style="{ color: (record.status === 'FAILED' || record.status === '3') ? '#ff4d4f' : 'inherit' }">
                {{ record.responseMsg ? record.responseMsg.slice(0, 60) : '-' }}
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'reportData'">
            <a-tooltip :title="record.reportData">
              <span>{{ record.reportData ? record.reportData.slice(0, 80) + '...' : '-' }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === '__detail_action'">
            <template v-if="record.status === 'FAILED' || record.status === '3'">
              <a-button v-if="isTimeoutError(record.responseMsg)" type="link" size="small" :loading="retryingDetailId === record.id" @click="onRetryDetail(record)">重试</a-button>
              <a-button v-else type="link" size="small" :loading="retryingDetailId === record.id" @click="onAutoCorrect(record)">自动纠错</a-button>
            </template>
            <span v-else style="color: #999">—</span>
          </template>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  ledgerBatchList, ledgerBatchCreate, ledgerBatchExecute, ledgerBatchCancel, ledgerBatchDetail,
  ledgerBatchAssemble,
  ledgerBatchRetryFailed, ledgerBatchRetryDetail, ledgerBatchAutoCorrect,
  ledgerBatchExport,
  ledgerTemplateList,
  ledgerFeedbackList, ledgerFeedbackStats,
} from '../../common/v1/api/resource';
import { getBatchStatusLabel, getBatchStatusColor, getReportStatusLabel, getReportStatusTagColor } from '../../common/v1/constants/ledger';

const activeTab = ref('batch');

const batchList = ref<any[]>([]);
const batchLoading = ref(false);
const batchColumns = [
  { title: '批次号', dataIndex: 'batchNo', width: 180 },
  { title: '模板', dataIndex: 'templateId', width: 200, ellipsis: true },
  { title: '目标', dataIndex: 'targetSystem', width: 140 },
  { title: '成功/失败/总数', dataIndex: 'successFail', width: 160, align: 'center' },
  { title: '状态', dataIndex: 'status', width: 100, align: 'center' },
  { title: '进度', dataIndex: 'progress', width: 200 },
  { title: '触发时间', dataIndex: 'triggerTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 260, fixed: 'right' },
];

function batchLabel(v: string) { return getBatchStatusLabel(v); }
function batchTagColor(v: string) { return getBatchStatusColor(v); }
/** 兼容历史数字批次状态码(2=执行中,3=已完成,5=失败),归一到 BATCH_STATUS 英文名 */
function normBatchStatus(v: any): string {
  const s = String(v ?? '');
  return ({ '2': 'RUNNING', '3': 'DONE', '5': 'FAILED' } as Record<string, string>)[s] ?? s;
}
function canExecute(v: string) { return v === 'READY' || v === 'FAILED'; }
function canCancel(v: string) { return v !== 'DONE' && v !== 'CANCELLED'; }
function progressPercent(r: any) {
  const total = r?.totalCount || 0;
  if (!total) return 0;
  return Math.round(((r.successCount || 0) + (r.failCount || 0)) / total * 100);
}
function progressStatus(r: any) {
  const s = normBatchStatus(r.status);
  if (s === 'FAILED') return 'exception';
  if (s === 'DONE') return 'success';
  return 'active';
}
function batchPercent(b: any) {
  const total = b?.totalCount || 0;
  if (!total) return 0;
  return Math.round(((b.successCount || 0) + (b.failCount || 0)) / total * 100);
}
function batchProgressStatus(b: any) {
  if (!b) return 'active' as const;
  const s = normBatchStatus(b.status);
  if (s === 'FAILED') return 'exception' as const;
  if (s === 'DONE') return 'success' as const;
  return 'active' as const;
}

const batchStats = computed(() => ({
  total: batchList.value.length,
  done: batchList.value.filter((b) => normBatchStatus(b.status) === 'DONE').length,
  running: batchList.value.filter((b) => normBatchStatus(b.status) === 'RUNNING').length,
  failed: batchList.value.filter((b) => normBatchStatus(b.status) === 'FAILED').length,
}));

async function loadBatches() {
  batchLoading.value = true;
  try {
    const res: any = await ledgerBatchList({ pageNum: 1, pageSize: 50 });
    batchList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '查询失败');
  } finally {
    batchLoading.value = false;
  }
}

const tplOptions = ref<any[]>([]);
async function loadTplOptions() {
  try {
    const res: any = await ledgerTemplateList({ pageNum: 1, pageSize: 100, enabled: 'Y' });
    const list = res?.data?.list ?? [];
    tplOptions.value = list.map((t: any) => ({ id: t.id, templateName: `${t.templateName} (${t.version || 'v?'})` }));
  } catch (e) { /* 模板选项加载失败不阻塞批次创建（降级为空选项）*/ }
}

const showCreate = ref(false);
const creating = ref(false);
const createReq = reactive({ templateId: undefined as string | undefined, targetSystem: 'PROVINCIAL_EMS', ledgerIdsText: '' });

function onOpenCreate() {
  createReq.templateId = undefined;
  createReq.targetSystem = 'PROVINCIAL_EMS';
  createReq.ledgerIdsText = '';
  loadTplOptions();
  showCreate.value = true;
}

async function onCreate() {
  if (!createReq.templateId) { message.warning('请选择模板'); return; }
  creating.value = true;
  try {
    const ledgerIds = createReq.ledgerIdsText
      ? createReq.ledgerIdsText.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const res: any = await ledgerBatchCreate({
      templateId: createReq.templateId,
      targetSystem: createReq.targetSystem,
      ledgerIds,
    });
    message.success(`批次已创建:${res?.data?.batchNo ?? ''}`);
    showCreate.value = false;
    loadBatches();
  } catch (e: any) {
    message.error(e?.message || '创建失败');
  } finally {
    creating.value = false;
  }
}

function onExecute(record: any) {
  Modal.confirm({
    title: '确认执行批次?',
    content: `${record.batchNo} 共 ${record.totalCount} 条,执行上报批次`,
    onOk: async () => {
      try {
        const res: any = await ledgerBatchExecute({ batchId: record.id });
        const data = res?.data ?? {};
        const msg = `执行完成:成功 ${data.successCount ?? 0} / 失败 ${data.failCount ?? 0}`;
        if ((data.failCount || 0) > 0) message.warning(msg);
        else message.success(msg);
        loadBatches();
        if (currentBatch.value?.id === record.id) onViewDetail(record);
      } catch (e: any) {
        message.error(e?.message || '执行失败');
      }
    },
  });
}

function onCancel(record: any) {
  Modal.confirm({
    title: '确认取消批次?',
    content: '取消后未执行的台账将标记为已取消',
    onOk: async () => {
      try {
        await ledgerBatchCancel({ batchId: record.id });
        message.success('已取消');
        loadBatches();
      } catch (e: any) {
        message.error(e?.message || '取消失败');
      }
    },
  });
}

const assemblePreview = ref<any>(null);
const previewing = ref(false);

async function onPreviewAssemble() {
  if (!createReq.templateId) { message.warning('请先选择模板'); return; }
  previewing.value = true;
  try {
    const ledgerIds = createReq.ledgerIdsText
      ? createReq.ledgerIdsText.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const res: any = await ledgerBatchAssemble({
      templateId: createReq.templateId,
      targetSystem: createReq.targetSystem,
      ledgerIds,
    });
    assemblePreview.value = res?.data ?? null;
    const skipped = assemblePreview.value?.skipped?.length ?? 0;
    if (skipped > 0) message.warning(`组装完成:有效 ${assemblePreview.value.validCount} 条,${skipped} 条将被剔除`);
    else message.success(`组装完成:有效 ${assemblePreview.value.validCount} 条`);
  } catch (e: any) {
    message.error(e?.message || '预览失败');
  } finally {
    previewing.value = false;
  }
}

const showDetail = ref(false);
const currentBatch = ref<any>(null);
const detailList = ref<any[]>([]);
const detailLoading = ref(false);
const detailColumns = [
  { title: '台账ID', dataIndex: 'ledgerId', width: 220, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 100, align: 'center' },
  { title: '尝试次数', dataIndex: 'attemptCount', width: 90, align: 'center' },
  { title: '失败原因', dataIndex: 'responseMsg', width: 150, ellipsis: true },
  { title: '上报数据', dataIndex: 'reportData', width: 220, ellipsis: true },
  { title: '上报时间', dataIndex: 'reportTime', width: 160 },
  { title: '操作', dataIndex: '__detail_action', width: 140, align: 'center' },
];
function detailStatusLabel(v: string) { return getReportStatusLabel(v); }
function detailTagColor(v: string) { return getReportStatusTagColor(v); }

async function onViewDetail(record: any) {
  currentBatch.value = record;
  showDetail.value = true;
  detailLoading.value = true;
  try {
    const res: any = await ledgerBatchDetail(record.id);
    detailList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '加载明细失败');
  } finally {
    detailLoading.value = false;
  }
}

// ===== 异常处理 =====
const retryingBatchId = ref('');
const retryingDetailId = ref('');

function isTimeoutError(msg?: string) {
  return !!(msg && (msg.includes('超时') || msg.includes('连接')));
}

async function onRetryFailed(record: any) {
  retryingBatchId.value = record.id;
  try {
    const res: any = await ledgerBatchRetryFailed({ batchId: record.id });
    const raw = res?.data ?? res;
    message.success(`重试完成：成功 ${raw?.retrySuccess || 0} 条，仍失败 ${raw?.retryFail || 0} 条`);
    loadBatches();
    if (showDetail.value && currentBatch.value?.id === record.id) onViewDetail(record);
  } catch {
    message.error('重试失败项出错');
  } finally {
    retryingBatchId.value = '';
  }
}

async function onRetryDetail(record: any) {
  retryingDetailId.value = record.id;
  try {
    const res: any = await ledgerBatchRetryDetail({ batchId: currentBatch.value?.id, detailId: record.id });
    const raw = res?.data ?? res;
    if (raw?.success) {
      message.success(`重试成功（第 ${raw.attemptCount} 次尝试）`);
    } else {
      message.error(raw?.message || '重试失败');
    }
    if (currentBatch.value) onViewDetail(currentBatch.value);
    loadBatches();
  } catch {
    message.error('重试出错');
  } finally {
    retryingDetailId.value = '';
  }
}

async function onAutoCorrect(record: any) {
  retryingDetailId.value = record.id;
  try {
    const res: any = await ledgerBatchAutoCorrect({ batchId: currentBatch.value?.id, detailId: record.id });
    const raw = res?.data ?? res;
    if (raw?.success) {
      message.success(raw?.message || '自动纠错成功');
    } else {
      message.error(raw?.message || '纠错失败');
    }
    if (currentBatch.value) onViewDetail(currentBatch.value);
    loadBatches();
  } catch {
    message.error('纠错出错');
  } finally {
    retryingDetailId.value = '';
  }
}

// ===== 导出 Excel =====
const exportingBatchId = ref('');

async function onExport(record: any) {
  exportingBatchId.value = record.id;
  try {
    const res: any = await ledgerBatchExport(record.id);
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `台账上报_${record.batchNo || record.id}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    message.success('导出成功');
  } catch {
    message.error('导出失败');
  } finally {
    exportingBatchId.value = '';
  }
}

const feedbackList = ref<any[]>([]);
const feedbackLoading = ref(false);
const feedbackColumns = [
  { title: '批次ID', dataIndex: 'batchId', width: 200, ellipsis: true },
  { title: '总数', dataIndex: 'totalCount', width: 80, align: 'center' },
  { title: '成功', dataIndex: 'successCount', width: 80, align: 'center' },
  { title: '失败', dataIndex: 'failCount', width: 80, align: 'center' },
  { title: '成功率', dataIndex: 'successRatio', width: 100 },
  { title: '反馈时间', dataIndex: 'feedbackTime', width: 160 },
  { title: '备注', dataIndex: 'remark', width: 150, ellipsis: true },
];
const stats = reactive<any>({});

async function loadFeedback() {
  feedbackLoading.value = true;
  try {
    const [listRes, statsRes]: any = await Promise.all([
      ledgerFeedbackList({ pageNum: 1, pageSize: 50 }),
      ledgerFeedbackStats(),
    ]);
    feedbackList.value = listRes?.data?.list ?? [];
    Object.assign(stats, statsRes?.data ?? {});
  } catch (e: any) {
    message.error(e?.message || '加载反馈失败');
  } finally {
    feedbackLoading.value = false;
  }
}

onMounted(() => {
  loadBatches();
  loadFeedback();
});
</script>

<style scoped lang="less">
.page-container { padding: 16px; height: 100%; overflow: auto; }
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
