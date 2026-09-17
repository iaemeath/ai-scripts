<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <!-- 单 tab = 归档记录(统计+筛选+列表):驳回是审核状态之一,用状态筛选查看 -->
      <a-tab-pane key="history" tab="归档记录">
        <div class="tab-inner">
          <!-- 区域1:统计(左:审核结果占比饼图;右:核心指标卡) -->
          <a-row :gutter="16" style="margin-bottom: 16px">
            <a-col :span="9">
              <a-card title="审核结果占比" size="small">
                <div ref="pieChartRef" style="height: 220px" />
              </a-card>
            </a-col>
            <a-col :span="15">
              <!-- hero 指标 + 内联支撑行:主指标大数字,支撑项同行扫读(替代等权重卡砖墙) -->
              <div class="stat-hero-col">
                <StatHero title="归档记录总数" :value="historyStats.total" :supports="historySupports" @support-click="onHistorySupportClick" />
              </div>
            </a-col>
          </a-row>
          <a-form layout="inline" :model="historyQuery" style="margin-bottom: 12px">
            <a-form-item label="审核状态">
              <a-select v-model:value="historyQuery.reviewStatus" placeholder="全部" allow-clear style="width: 140px" :options="reviewStatusOptions" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="loadHistory">查询</a-button>
            </a-form-item>
          </a-form>
          <a-table :columns="historyColumns" :data-source="historyList" :loading="historyLoading" :scroll="{ x: 1070 }" :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'archiveTime'">
                {{ fmtTime(record.archiveTime) }}
              </template>
              <template v-else-if="column.dataIndex === 'reviewTime'">
                {{ fmtTime(record.reviewTime) }}
              </template>
              <template v-else-if="column.dataIndex === 'archiveType'">
                <a-tag>{{ archiveTypeLabel(record.archiveType) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'reviewStatus'">
                <a-tag :color="reviewTagColor(record.reviewStatus)">{{ reviewLabel(record.reviewStatus) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'reviewOpinion'">
                <a-tooltip :title="record.reviewOpinion">
                  <span>{{ record.reviewOpinion ? (record.reviewOpinion.length > 30 ? record.reviewOpinion.slice(0, 30) + '...' : record.reviewOpinion) : '-' }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="onViewArchiveDetail(record)">详情</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

    </a-tabs>

    <!-- 归档详情抽屉 -->
    <a-drawer v-model:open="archiveDetailVisible" title="归档详情" width="600px">
      <a-descriptions v-if="currentArchive" :column="2" bordered size="small">
        <a-descriptions-item label="归档类型">
          <a-tag>{{ archiveTypeLabel(currentArchive.archiveType) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="审核状态">
          <a-tag :color="reviewTagColor(currentArchive.reviewStatus)">{{ reviewLabel(currentArchive.reviewStatus) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="归档人">{{ currentArchive.archiveBy || '-' }}</a-descriptions-item>
        <a-descriptions-item label="归档时间">{{ currentArchive.archiveTime || '-' }}</a-descriptions-item>
        <a-descriptions-item label="审核人">{{ currentArchive.reviewer || '-' }}</a-descriptions-item>
        <a-descriptions-item label="审核时间">{{ currentArchive.reviewTime || '-' }}</a-descriptions-item>
        <a-descriptions-item label="审核意见" :span="2">{{ currentArchive.reviewOpinion || '-' }}</a-descriptions-item>
      </a-descriptions>
      <!-- 归档数据快照 -->
      <template v-if="currentArchive?.archiveData">
        <a-divider orientation="left" style="font-size: 13px">归档数据快照</a-divider>
        <pre class="archive-snapshot">{{ prettySnapshot(currentArchive.archiveData) }}</pre>
      </template>
    </a-drawer>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { message } from 'ant-design-vue';
import * as echarts from 'echarts';
import { SEMANTIC_COLOR } from '../../common/v2/constants/ledger';
import { fmtTime } from '../../common/v2/utils/datetime';
import StatHero from '../../common/v2/components/StatHero.vue';
import {
  ledgerArchiveList, ledgerArchiveInfo, ledgerArchiveStats,
} from '../../common/v2/mock/gateway';
import { REVIEW_STATUS_OPTIONS, getReviewStatusLabel, getReviewStatusColor, getArchiveStatusLabel, getArchiveStatusColor, getArchiveTypeLabel, getSyncStatusLabel } from '../../common/v2/constants/ledger';

const activeTab = ref('history');


function reviewLabel(v: string) { return getReviewStatusLabel(v); }
function reviewTagColor(v: string) { return getReviewStatusColor(v); }
const reviewStatusOptions = REVIEW_STATUS_OPTIONS;

function archiveTypeLabel(v: string) { return getArchiveTypeLabel(v); }

function archiveStatusLabel(v: string) { return getArchiveStatusLabel(v); }
function archiveStatusColor(v: string) { return getArchiveStatusColor(v); }

const historyQuery = reactive({ reviewStatus: undefined as string | undefined, pageNum: 1, pageSize: 50 });
const historyList = ref<any[]>([]);
const historyLoading = ref(false);

// 归档统计:服务端全局口径(不受审核状态筛选/分页截断影响);接口异常时兜底为当前列表口径
const historyStats = reactive({ total: 0, approved: 0, rejected: 0 });
function calcHistoryStatsLocally() {
  const list = historyList.value;
  historyStats.total = list.length;
  historyStats.approved = list.filter((r) => String(r.reviewStatus) === 'APPROVED' || String(r.reviewStatus) === '1').length;
  historyStats.rejected = list.filter((r) => String(r.reviewStatus) === 'REJECTED' || String(r.reviewStatus) === '2').length;
}
async function loadArchiveStats() {
  try {
    const res: any = await ledgerArchiveStats();
    Object.assign(historyStats, res?.data ?? {});
  } catch {
    calcHistoryStatsLocally();
  }
}

// ===== hero 支撑项(点击联动审核状态筛选;再点同一项取消筛选) =====
const historySupports = computed(() => [
  { key: 'APPROVED', label: '已通过', value: historyStats.approved, clickable: true },
  { key: 'REJECTED', label: '已驳回', value: historyStats.rejected, color: SEMANTIC_COLOR.error, clickable: true },
  {
    key: 'rate',
    label: '归档通过率',
    value: `${historyStats.total ? Math.round((historyStats.approved * 100) / historyStats.total) : 0}%`,
  },
]);
function onHistorySupportClick(key: string) {
  const target = key as 'APPROVED' | 'REJECTED';
  historyQuery.reviewStatus = historyQuery.reviewStatus === target ? undefined : target;
  loadHistory();
}

// ===== 饼图:审核结果占比(全局口径,与统计卡一致) =====
const pieChartRef = ref<HTMLDivElement | null>(null);
let pieChart: echarts.ECharts | null = null;

function renderPie() {
  if (!historyStats.total) return;
  if (!pieChartRef.value) return;
  if (!pieChart) pieChart = echarts.init(pieChartRef.value);
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
    series: [
      {
        name: '审核结果',
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '45%'],
        label: { formatter: '{b}\n{c} 条' },
        data: [
          { value: historyStats.approved, name: '已通过', itemStyle: { color: '#52c41a' } },
          { value: historyStats.rejected, name: '已驳回', itemStyle: { color: '#ff4d4f' } },
        ],
      },
    ],
  });
}

const historyColumns = [
  { title: '台账名称', dataIndex: 'ledgerName', width: 220, ellipsis: true },
  { title: '类型', dataIndex: 'archiveType', width: 80, align: 'center' },
  { title: '归档人', dataIndex: 'archiveBy', width: 100 },
  { title: '归档时间', dataIndex: 'archiveTime', width: 160 },
  { title: '审核人', dataIndex: 'reviewer', width: 100 },
  { title: '审核时间', dataIndex: 'reviewTime', width: 160 },
  { title: '审核状态', dataIndex: 'reviewStatus', width: 100, align: 'center' },
  { title: '审核意见', dataIndex: 'reviewOpinion', width: 150, ellipsis: true },
  { title: '操作', dataIndex: 'action', width: 80, fixed: 'right', align: 'center' },
];

// 归档详情抽屉(对齐上报记录形态)
const archiveDetailVisible = ref(false);
const currentArchive = ref<any>(null);

function onViewArchiveDetail(record: any) {
  currentArchive.value = record;
  archiveDetailVisible.value = true;
  // 拉取完整归档记录(含数据快照)
  ledgerArchiveInfo(record.id)
    .then((res: any) => { currentArchive.value = res?.data ?? record; })
    .catch(() => { /* 保留行数据展示 */ });
}

/** 归档数据快照 JSON 美化(供抽屉 pre 展示) */
function prettySnapshot(s: string | null): string {
  if (!s) return '-';
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

async function loadHistory() {
  historyLoading.value = true;
  try {
    const res: any = await ledgerArchiveList({ ...historyQuery, pageSize: 999 });
    historyList.value = res?.data?.list ?? [];
    await loadArchiveStats();
    await nextTick();
    renderPie();
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    historyLoading.value = false;
  }
}
onMounted(() => {
  loadHistory();
});
</script>

<style scoped lang="less">
.page-container { padding: 16px; height: 100%; overflow: auto; }
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.total-text { color: #888; font-size: 13px; }
.stat-hero-col {
  height: 100%;

  > :deep(.ant-card) {
    height: 100%;
  }
}
.archive-snapshot {
  max-height: 320px;
  overflow: auto;
  background: #fafafa;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
:deep(.ant-table-tbody) {
  font-variant-numeric: tabular-nums;
}
</style>
