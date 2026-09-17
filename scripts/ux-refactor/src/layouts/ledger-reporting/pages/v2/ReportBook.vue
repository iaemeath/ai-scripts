<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <!-- 第一 tab = 上报批次;三段式布局:上方统计 → 中间工具栏 → 下方批次列表 -->
      <a-tab-pane key="batch" tab="上报批次">
        <div class="tab-inner">
          <!-- 区域1:统计(左:饼图;右:批次统计+明细统计) -->
          <a-row :gutter="16" style="margin-bottom: 16px">
            <a-col :span="9">
              <a-card title="上报结果占比(按明细)" size="small">
                <a-empty v-if="pieEmpty" description="暂无上报数据,去台账信息页·常州台账勾选台账「批量上报」" style="padding: 40px 0" />
                <div v-else ref="pieChartRef" style="height: 220px" />
              </a-card>
            </a-col>
            <a-col :span="15">
              <!-- hero 指标 + 内联支撑行:主指标大数字,支撑项同行扫读(替代等权重卡砖墙) -->
              <div class="stat-hero-col">
                <StatHero title="上报批次" :value="batchStats.total" :supports="batchSupports" @support-click="onBatchSupportClick" />
                <StatHero title="上报明细" :value="recordStats.total || 0" :supports="recordSupports" @support-click="onRecordSupportClick" />
              </div>
            </a-col>
          </a-row>

          <!-- 区域2:工具栏(状态筛选) -->
          <div class="action-bar">
            <a-space>
              <span class="toolbar-label">状态</span>
              <a-select v-model:value="batchStatusFilter" :options="batchStatusOptions" placeholder="全部" allow-clear style="width: 140px" />
            </a-space>
            <span class="toolbar-hint">上报动作在台账信息页·常州台账 tab 的「批量上报」触发 ｜ 行内「同步」拉取省调审核状态</span>
          </div>

          <!-- 区域3:批次列表 -->
          <a-table :columns="batchColumns" :data-source="filteredBatches" :loading="batchLoading" :scroll="{ x: 1200 }" :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'batchNo'">
                <a @click="onViewDetail(record)">{{ record.batchNo }}</a>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="batchTagColor(record.status)">{{ batchLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'triggerTime'">
                {{ fmtTime(record.triggerTime) }}
              </template>
              <template v-else-if="column.dataIndex === 'progress'">
                <a-tooltip :title="progressTip(record)">
                  <a-progress :percent="progressPercent(record)" size="small" :status="progressStatus(record)" />
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'successFail'">
                <span>{{ record.successCount || 0 }}</span>
                /
                <span style="color: #ff4d4f">{{ record.failCount || 0 }}</span>
                / {{ record.totalCount || 0 }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="onViewDetail(record)">详情</a-button>
                <a-button type="link" size="small" :loading="syncingBatchId === record.id" @click="onSyncReview(record)">同步审核状态</a-button>
                <a-button type="link" size="small" :loading="exportingBatchId === record.id" @click="onExport(record)">导出</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- 第二 tab = 失败记录(纯明细级,跨批次,不显批次;可勾选批量重新上报) -->
      <a-tab-pane key="failed">
        <template #tab>
          <span>失败记录</span>
          <a-badge :count="failedTotal" :number-style="{ marginLeft: '6px', backgroundColor: '#ff4d4f' }" />
        </template>
        <div class="tab-inner">
          <div class="action-bar">
            <a-space>
              <a-button type="primary" ghost :disabled="!failedSelectedRowKeys.length" :loading="batchReReporting" @click="onBatchReReport">
                批量重新上报{{ failedSelectedRowKeys.length ? `(${failedSelectedRowKeys.length})` : '' }}
              </a-button>
            </a-space>
            <span class="toolbar-hint">跨批次汇总所有上报失败的明细,勾选后批量重新上报</span>
          </div>
          <a-table :columns="failedColumns" :data-source="failedList" :loading="failedLoading" :row-selection="{ selectedRowKeys: failedSelectedRowKeys, onChange: (keys: string[]) => failedSelectedRowKeys = keys, preserveSelectedRowKeys: true }" :scroll="{ x: 1000 }" :pagination="{ current: failedPage, pageSize: failedPageSize, showSizeChanger: true, total: failedTotal, showTotal: (t: number) => `共 ${t} 条`, onChange: (p: number, ps: number) => { failedPage = p; failedPageSize = ps; loadFailedRecords(); } }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'responseMsg'">
                <a-tooltip :title="record.responseMsg">
                  <span style="color: #ff4d4f">{{ record.responseMsg ? record.responseMsg.slice(0, 60) : '-' }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'reportTime'">
                {{ fmtTime(record.reportTime) }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-space size="0">
                  <a-button v-if="canReReport(record)" type="link" size="small" :loading="retryingDetailId === record.id" @click="onReReport(record)">重新上报</a-button>
                  <a-button v-if="canCancelDetail(record)" type="link" size="small" danger :loading="cancellingDetailId === record.id" @click="onCancelDetail(record)">撤销</a-button>
                  <span v-if="!canReReport(record) && !canCancelDetail(record)" style="color: #999">—</span>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 批次详情抽屉(查看口径;明细级操作保留:重新上报/撤销/模拟审核) -->
    <a-drawer v-model:open="showDetail" :title="`批次详情 - ${currentBatch?.batchNo || ''}`" width="960px">
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
        <a-descriptions-item label="进度" :span="2">
          <a-space size="4">
            <a-progress :percent="batchPercent(currentBatch)" :status="batchProgressStatus(currentBatch)" style="width: 160px" />
            <a-tooltip title="进度=审核进度:(已通过+未通过)/总数;新增与专业审核中尚未出具审核结果,不进入进度,与传输「成功」数含义不同">
              <info-circle-outlined style="color: #999" />
            </a-tooltip>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="触发时间">{{ currentBatch?.triggerTime }}</a-descriptions-item>
      </a-descriptions>
      <a-table :columns="detailColumns" :data-source="detailList" :loading="detailLoading" :scroll="{ x: 1250 }" row-key="id" size="small" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="displayStatusColor(record)">{{ displayStatusLabel(record) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'responseMsg'">
            <a-tooltip :title="record.responseMsg">
              <span :style="{ color: normDetailStatus(record) === 'FAILED' ? '#ff4d4f' : 'inherit' }">
                {{ record.responseMsg ? record.responseMsg.slice(0, 60) : '-' }}
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'reportTime'">
            {{ fmtTime(record.reportTime) }}
          </template>
          <template v-else-if="column.dataIndex === '__detail_action'">
            <a-space size="0">
              <!-- 失败(含超时)或审核未通过 → 重新上报;待上报/审核中 → 撤销 -->
              <a-button v-if="canReReport(record)" type="link" size="small" :loading="retryingDetailId === record.id" @click="onReReport(record)">重新上报</a-button>
              <a-button v-if="canCancelDetail(record)" type="link" size="small" danger :loading="cancellingDetailId === record.id" @click="onCancelDetail(record)">撤销</a-button>
              <span v-if="!canReReport(record) && !canCancelDetail(record)" style="color: #999">—</span>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import * as echarts from 'echarts';
import { SEMANTIC_COLOR } from '../../common/v2/constants/ledger';
import { fmtTime } from '../../common/v2/utils/datetime';
import StatHero from '../../common/v2/components/StatHero.vue';
import {
  ledgerBatchList, ledgerBatchDetail, ledgerBatchRetryDetail, ledgerBatchRetryDetailBatch,
  ledgerBatchCancelDetail, ledgerBatchSyncReview,
  ledgerBatchFailedRecords, ledgerBatchRecordStats, ledgerBatchExport, ledgerBatchStats,
} from '../../common/v2/mock/gateway';
import { getBatchStatusLabel, getBatchStatusColor } from '../../common/v2/constants/ledger';

const activeTab = ref('batch');

const batchList = ref<any[]>([]);
const batchLoading = ref(false);
const batchColumns = [
  { title: '批次号', dataIndex: 'batchNo', width: 190 },
  { title: '成功/失败/总数', dataIndex: 'successFail', width: 160, align: 'right' },
  { title: '状态', dataIndex: 'status', width: 100, align: 'center' },
  { title: '进度', dataIndex: 'progress', width: 200 },
  { title: '触发时间', dataIndex: 'triggerTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 230, fixed: 'right' },
];

function batchLabel(v: string) { return getBatchStatusLabel(v); }
function batchTagColor(v: string) { return getBatchStatusColor(v); }

/** 审核进度口径:仅已出具审核结果(通过+未通过)的明细计入;新增/专业审核中未完成,不进入进度 */
function progressPercent(r: any) {
  const total = r?.totalCount || 0;
  if (!total) return 0;
  return Math.round((((r.approvedCount || 0) + (r.rejectedCount || 0)) / total) * 100);
}
function progressStatus(r: any) {
  if (progressPercent(r) >= 100) return 'success';
  if (String(r?.status ?? '') === 'FAILED') return 'exception';
  return 'active';
}
/** 审核进度悬浮说明 */
function progressTip(r: any) {
  const total = r?.totalCount || 0;
  const done = (r?.approvedCount || 0) + (r?.rejectedCount || 0);
  return `通过 ${r?.approvedCount || 0} + 未通过 ${r?.rejectedCount || 0} = 已出具审核结果 ${done} 条 / 总数 ${total} 条;新增与专业审核中不进入进度`;
}
function batchPercent(b: any) {
  return progressPercent(b);
}
function batchProgressStatus(b: any) {
  return progressStatus(b);
}

// 批次统计:服务端全量聚合口径;接口异常时兜底为当前列表(999 条内)口径
const batchStats = reactive({ total: 0, done: 0, running: 0, failed: 0 });
function calcBatchStatsLocally() {
  const list = batchList.value;
  batchStats.total = list.length;
  batchStats.done = list.filter((b) => b.status === 'DONE').length;
  batchStats.running = list.filter((b) => b.status === 'RUNNING').length;
  batchStats.failed = list.filter((b) => b.status === 'FAILED').length;
}
async function loadBatchStats() {
  try {
    const res: any = await ledgerBatchStats();
    Object.assign(batchStats, res?.data ?? {});
  } catch {
    calcBatchStatsLocally();
  }
}

// ===== hero 指标支撑项(语义色只给异常/进行态;可点击项联动工具栏筛选/tab) =====
const batchSupports = computed(() => [
  { key: 'DONE', label: '完成', value: batchStats.done, clickable: true },
  { key: 'RUNNING', label: '执行中', value: batchStats.running, color: SEMANTIC_COLOR.primary, clickable: true },
  { key: 'FAILED', label: '失败', value: batchStats.failed, color: SEMANTIC_COLOR.error, clickable: true },
]);
const recordSupports = computed(() => [
  { key: 'reported', label: '已上报', value: recordStats.reported || 0 },
  { key: 'reviewPending', label: '审核中', value: recordStats.reviewPending || 0, color: SEMANTIC_COLOR.warning },
  { key: 'reviewApproved', label: '审核通过', value: recordStats.reviewApproved || 0 },
  { key: 'reviewRejected', label: '审核未通过', value: recordStats.reviewRejected || 0, color: SEMANTIC_COLOR.error },
  { key: 'failed', label: '上报失败', value: recordStats.failed || 0, color: SEMANTIC_COLOR.error, clickable: true },
]);
function onBatchSupportClick(key: string) {
  batchStatusFilter.value = batchStatusFilter.value === key ? undefined : key;
}
function onRecordSupportClick(key: string) {
  if (key === 'failed') activeTab.value = 'failed';
}

// ===== 工具栏状态筛选 =====
const batchStatusFilter = ref<string | undefined>(undefined);
const batchStatusOptions = [
  { label: '待执行', value: 'READY' },
  { label: '执行中', value: 'RUNNING' },
  { label: '已完成', value: 'DONE' },
  { label: '失败', value: 'FAILED' },
  { label: '已取消', value: 'CANCELLED' },
];
const filteredBatches = computed(() => {
  if (!batchStatusFilter.value) return batchList.value;
  return batchList.value.filter((b) => b.status === batchStatusFilter.value);
});

async function loadBatches() {
  batchLoading.value = true;
  try {
    const res: any = await ledgerBatchList({ pageNum: 1, pageSize: 999 });
    batchList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '查询失败');
  } finally {
    batchLoading.value = false;
  }
}

// ===== 批次明细抽屉(查看;明细级操作保留) =====
const showDetail = ref(false);
const currentBatch = ref<any>(null);
const detailList = ref<any[]>([]);
const detailLoading = ref(false);
const detailColumns = [
  { title: '台账名称', dataIndex: 'deviceName', width: 200, ellipsis: true },
  { title: '所属县区', dataIndex: 'areaName', width: 90 },
  { title: '上报状态', dataIndex: 'status', width: 110, align: 'center' },
  { title: '尝试次数', dataIndex: 'attemptCount', width: 80, align: 'center' },
  { title: '原因', dataIndex: 'responseMsg', width: 170, ellipsis: true },
  { title: '上报时间', dataIndex: 'reportTime', width: 145 },
  { title: '操作', dataIndex: '__detail_action', width: 210, align: 'center', fixed: 'right' },
];

/** 明细状态归一:DB 数字 → 枚举名(0待报/1上报中/2已报/3失败/4取消) */
function normDetailStatus(r: any): string {
  const map: Record<string, string> = { '0': 'PENDING', '1': 'REPORTING', '2': 'REPORTED', '3': 'FAILED', '4': 'CANCELLED' };
  return map[String(r.status)] ?? String(r.status ?? '');
}

/** 统一上报状态(单列四态主流程):新增 → 专业审核中 → 已通过/未通过;传输失败/已取消为例外态 */
function displayStatusLabel(r: any): string {
  const s = normDetailStatus(r);
  if (s === 'PENDING' || s === 'REPORTING') return '新增';
  if (s === 'REPORTED') {
    if (r.reviewStatus === 'APPROVED' || r.reviewStatus === '1') return '已通过';
    if (r.reviewStatus === 'REJECTED' || r.reviewStatus === '2') return '未通过';
    return '专业审核中';
  }
  if (s === 'FAILED') return '上报失败';
  if (s === 'CANCELLED') return '已取消';
  return s;
}
function displayStatusColor(r: any): string {
  const s = normDetailStatus(r);
  if (s === 'PENDING' || s === 'REPORTING') return 'blue';
  if (s === 'REPORTED') {
    if (r.reviewStatus === 'APPROVED' || r.reviewStatus === '1') return 'green';
    if (r.reviewStatus === 'REJECTED' || r.reviewStatus === '2') return 'red';
    return 'processing';
  }
  if (s === 'FAILED') return 'red';
  return 'default';
}
function isInReview(r: any) {
  return normDetailStatus(r) === 'REPORTED' && (!r.reviewStatus || r.reviewStatus === 'IN_REVIEW' || r.reviewStatus === '0');
}
function isReviewRejected(r: any) {
  return normDetailStatus(r) === 'REPORTED' && (r.reviewStatus === 'REJECTED' || r.reviewStatus === '2');
}
function canReReport(r: any) { return normDetailStatus(r) === 'FAILED' || isReviewRejected(r); }
function canCancelDetail(r: any) {
  const s = normDetailStatus(r);
  return s === 'PENDING' || isInReview(r);
}

async function onViewDetail(record: any) {
  currentBatch.value = record;
  showDetail.value = true;
  detailLoading.value = true;
  try {
    const res: any = await ledgerBatchDetail(record.id);
    detailList.value = res?.data?.list ?? [];
    if (res?.data?.batch) currentBatch.value = res.data.batch;
  } catch (e: any) {
    message.error(e?.message || '加载明细失败');
  } finally {
    detailLoading.value = false;
  }
}

// ===== 明细级操作(重新上报/撤销/模拟省调审批) =====
const retryingDetailId = ref('');
const cancellingDetailId = ref('');

async function onReReport(record: any) {
  retryingDetailId.value = record.id;
  try {
    const res: any = await ledgerBatchRetryDetail({ detailId: record.id, batchId: record.batchId });
    const raw = res?.data ?? res;
    if (raw?.success) message.success(raw?.message || '重新上报成功');
    else message.error(raw?.message || '重新上报失败');
    if (currentBatch.value) onViewDetail(currentBatch.value);
    loadBatches();
    loadFailedRecords();
    refreshStatsAndPie();
  } catch (e: any) {
    message.error(e?.message || '重新上报出错');
  } finally {
    retryingDetailId.value = '';
  }
}

async function onCancelDetail(record: any) {
  Modal.confirm({
    title: '确认撤销该条上报?',
    content: `撤销后「${record.deviceName || '该台账'}」状态转为已取消`,
    okText: '确认撤销',
    okType: 'danger',
    onOk: () => doCancelDetail(record),
  });
}

async function doCancelDetail(record: any) {
  cancellingDetailId.value = record.id;
  try {
    await ledgerBatchCancelDetail({ detailId: record.id });
    message.success('已撤销该条上报');
    if (currentBatch.value) onViewDetail(currentBatch.value);
    loadBatches();
    loadFailedRecords();
    refreshStatsAndPie();
  } catch (e: any) {
    message.error(e?.message || '撤销失败');
  } finally {
    cancellingDetailId.value = '';
  }
}

// ===== 批次审核状态同步(模拟省调回流):随机推动 1-2 条明细状态前进 =====
const syncingBatchId = ref('');

async function onSyncReview(record: any) {
  syncingBatchId.value = record.id;
  try {
    const res: any = await ledgerBatchSyncReview({ batchId: record.id });
    const d = res?.data ?? {};
    if (!d.changed) {
      message.info(d.message || '没有可推进状态的明细');
      return;
    }
    const detail = (d.changes ?? []).map((c: any) => `${c.deviceName}:${c.from}→${c.to}`).join('；');
    message.success(`已同步 ${d.changed} 条审核状态:${detail}`);
    loadBatches();
    refreshStatsAndPie();
    if (showDetail.value && currentBatch.value?.id === record.id) onViewDetail(record);
  } catch (e: any) {
    message.error(e?.message || '同步失败');
  } finally {
    syncingBatchId.value = '';
  }
}

// ===== 导出 =====
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

// ===== 失败记录 tab(纯明细;勾选批量重新上报) =====
const failedList = ref<any[]>([]);
const failedLoading = ref(false);
const failedTotal = ref(0);
const failedPage = ref(1);
const failedPageSize = ref(10);
const failedSelectedRowKeys = ref<string[]>([]);
const batchReReporting = ref(false);
const failedColumns = [
  { title: '台账名称', dataIndex: 'deviceName', width: 220, ellipsis: true },
  { title: '所属县区', dataIndex: 'areaName', width: 100 },
  { title: '失败原因', dataIndex: 'responseMsg', width: 280, ellipsis: true },
  { title: '尝试次数', dataIndex: 'attemptCount', width: 90, align: 'center' },
  { title: '失败时间', dataIndex: 'reportTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 110, align: 'center', fixed: 'right' },
];

async function loadFailedRecords() {
  failedLoading.value = true;
  try {
    const res: any = await ledgerBatchFailedRecords({ pageNum: failedPage.value, pageSize: failedPageSize.value });
    failedList.value = res?.data?.list ?? [];
    failedTotal.value = res?.data?.total ?? 0;
  } catch (e: any) {
    message.error(e?.message || '失败记录加载失败');
  } finally {
    failedLoading.value = false;
  }
}

/** 批量重新上报:仅传输失败/审核未通过的明细会重报,其余跳过 */
async function onBatchReReport() {
  if (!failedSelectedRowKeys.value.length) {
    message.warning('请先勾选要重新上报的失败明细');
    return;
  }
  batchReReporting.value = true;
  try {
    const res: any = await ledgerBatchRetryDetailBatch({ detailIds: failedSelectedRowKeys.value });
    const d = res?.data ?? {};
    const skipped = d.skipped ?? 0;
    const parts = [`成功 ${d.successCount ?? 0} 条`];
    if ((d.failCount ?? 0) > 0) parts.push(`不允许重报 ${d.failCount} 条`);
    if (skipped > 0) parts.push(`跳过 ${skipped} 条`);
    message.success(`批量重新上报完成:${parts.join(',')},重报成功的已进入专业审核`);
    failedSelectedRowKeys.value = [];
    loadFailedRecords();
    loadBatches();
    refreshStatsAndPie();
  } catch (e: any) {
    message.error(e?.message || '批量重新上报失败');
  } finally {
    batchReReporting.value = false;
  }
}

// ===== 饼图(明细口径统计嵌入上报批次 tab) =====
const recordStats = reactive<any>({});
const pieChartRef = ref<HTMLDivElement | null>(null);
const pieEmpty = computed(() => !((recordStats.total || 0) > 0));
let pieChart: echarts.ECharts | null = null;

function renderPie() {
  // 全 0 空态:不留白环(§8 空状态带引导)
  if (pieEmpty.value) return;
  if (!pieChartRef.value) return;
  if (!pieChart) pieChart = echarts.init(pieChartRef.value);
  const reported = recordStats.reported || 0;
  const failed = recordStats.failed || 0;
  const pending = (recordStats.pending || 0) + (recordStats.cancelled || 0);
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        name: '上报结果',
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '45%'],
        label: { formatter: '{b}\n{c} 条' },
        data: [
          { value: reported, name: '上报成功', itemStyle: { color: '#bfbfbf' } },
          { value: failed, name: '上报失败', itemStyle: { color: SEMANTIC_COLOR.error } },
          { value: pending, name: '待上报/已取消', itemStyle: { color: '#d9d9d9' } },
        ],
      },
    ],
  });
  pieChart.off('click');
  pieChart.on('click', (params: any) => {
    if (params.name === '上报失败') activeTab.value = 'failed';
  });
}

async function refreshStatsAndPie() {
  try {
    const res: any = await ledgerBatchRecordStats();
    Object.assign(recordStats, res?.data ?? {});
    await nextTick();
    renderPie();
  } catch { /* 统计加载失败不阻塞 */ }
  loadBatchStats();
}

onMounted(() => {
  onRefreshAll();
});

/** 同步按钮:批次+失败记录+统计一键从服务端取最新 */
function onRefreshAll() {
  loadBatches();
  loadFailedRecords();
  refreshStatsAndPie();
}
</script>

<style scoped lang="less">
.page-container { padding: 16px; height: 100%; overflow: auto; }
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar-hint { color: #999; font-size: 12px; }
.toolbar-label { color: #666; }
.stat-hero-col { display: flex; flex-direction: column; gap: 8px; height: 100%;

  > :deep(.ant-card) { flex: 1; }
}
</style>
