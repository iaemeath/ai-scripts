<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <!-- ============== 同步记录:三段式布局 上方统计 → 中间工具栏 → 下方列表 ============== -->
      <a-tab-pane key="sync" tab="同步记录">
        <div class="tab-inner">
          <!-- 区域1:统计(左:同步批次状态占比饼图;右:核心指标卡) -->
          <a-row :gutter="16" style="margin-bottom: 16px">
            <a-col :span="9">
              <a-card title="同步批次状态占比" size="small">
                <a-empty v-if="syncLogList.length === 0" description="暂无同步记录" style="padding: 40px 0" />
                <div v-else ref="pieChartRef" style="height: 220px" />
              </a-card>
            </a-col>
            <a-col :span="15">
              <!-- hero 指标 + 内联支撑行:主指标大数字,支撑项同行扫读(替代等权重卡砖墙) -->
              <div class="stat-hero-col">
                <StatHero title="同步总次数" :value="syncStats.total" :supports="syncSupports" @support-click="onSyncSupportClick" />
              </div>
            </a-col>
          </a-row>

          <!-- 区域2:工具栏(状态筛选) -->
          <div class="action-bar">
            <a-space>
              <span class="toolbar-label">状态</span>
              <a-select v-model:value="syncStatusFilter" :options="syncStatusOptions" placeholder="全部" allow-clear style="width: 130px" />
            </a-space>
            <span class="total-text">共 {{ syncTotal }} 条 ｜ 省调同步动作在台账信息页·常州台账 tab 触发</span>
          </div>

          <!-- 区域3:同步记录列表 -->
          <a-table :columns="syncColumns" :data-source="filteredSyncLogs" :loading="syncLoading"
                   :scroll="{ x: 1050 }"
                   :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'syncBatch'">
                <a @click="onViewSyncDetail(record)">{{ record.syncBatch }}</a>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'successFail'">
                <span>{{ record.successCount || 0 }}</span>
                /
                <span style="color: #ff4d4f">{{ record.failCount || 0 }}</span>
                / {{ record.totalCount || 0 }}
              </template>
              <template v-else-if="column.dataIndex === 'errorMsg'">
                <a-tooltip :title="record.errorMsg">
                  <span :style="{ color: record.errorMsg ? '#ff4d4f' : 'inherit' }">{{ record.errorMsg ? record.errorMsg.slice(0, 40) : '-' }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="onViewSyncDetail(record)">详情</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- 省地比对/差异检查 tab 已移除:逻辑收进台账信息页·常州台账 tab(前排行+角标),2026-09 -->
    </a-tabs>

    <!-- 同步详情抽屉:上方批次概览 + 下方逐条机组同步记录(带操作列) -->
    <a-drawer v-model:open="syncDetailVisible" :title="`同步详情 - ${currentSync?.syncBatch || ''}`" width="860px">
      <a-descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
        <a-descriptions-item label="同步批次" :span="2">{{ currentSync?.syncBatch || '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColor(currentSync?.status)">{{ statusLabel(currentSync?.status) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="总数">{{ currentSync?.totalCount ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="开始时间">{{ currentSync?.startTime || '-' }}</a-descriptions-item>
        <a-descriptions-item label="结束时间">{{ currentSync?.endTime || '-' }}</a-descriptions-item>
        <a-descriptions-item label="成功">{{ currentSync?.successCount ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="失败">{{ currentSync?.failCount ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="错误信息" :span="2">{{ currentSync?.errorMsg || '-' }}</a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">{{ currentSync?.remark || '-' }}</a-descriptions-item>
      </a-descriptions>

      <div class="detail-title">逐条机组同步记录</div>
      <a-table :columns="syncDetailColumns" :data-source="syncDetailList" :loading="syncDetailLoading"
               :scroll="{ x: 900 }" :pagination="{ pageSize: 10 }" row-key="id" size="small"
               :locale="{ emptyText: '该批次未保留逐条留痕(前置表仅保留最新快照);今日同步批次可查看逐条记录' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'gnType'">
            {{ gnTypeLabel(record.gnType) }}
          </template>
          <template v-else-if="column.dataIndex === 'sampleTime'">
            {{ fmtTime(record.sampleTime) }}
          </template>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { message } from 'ant-design-vue';
import * as echarts from 'echarts';
import {
  provincialSyncList, provincialSyncDetailList, provincialSyncStats,
} from '../../common/v2/mock/gateway';
import dayjs from 'dayjs';
import { SEMANTIC_COLOR } from '../../common/v2/constants/ledger';
import { fmtTime } from '../../common/v2/utils/datetime';
import StatHero from '../../common/v2/components/StatHero.vue';
import { getSyncStatusLabel } from '../../common/v2/constants/ledger';

// ============ 同步记录 tab ============
const activeTab = ref('sync');
const syncLogList = ref<any[]>([]);
const syncLoading = ref(false);
const syncTotal = ref(0);
const syncColumns = [
  { title: '同步批次', dataIndex: 'syncBatch', width: 220 },
  { title: '状态', dataIndex: 'status', width: 100, align: 'center' },
  { title: '成功/失败/总数', dataIndex: 'successFail', width: 140, align: 'right' },
  { title: '开始时间', dataIndex: 'startTime', width: 160 },
  { title: '结束时间', dataIndex: 'endTime', width: 160 },
  { title: '错误信息', dataIndex: 'errorMsg', width: 180, ellipsis: true },
  { title: '操作', dataIndex: 'action', width: 80, fixed: 'right', align: 'center' },
];

function statusLabel(v: string) { return getSyncStatusLabel(v); }
function statusColor(v: string) {
  const map: Record<string, string> = { RUNNING: 'processing', SUCCESS: 'green', PARTIAL: 'orange', FAILED: 'red' };
  return map[String(v)] || 'default';
}

// 同步统计:服务端全量聚合口径;接口异常时兜底为当前列表(999 条内)口径
const syncStats = reactive({ total: 0, success: 0, partial: 0, failed: 0, units: 0 });
function calcSyncStatsLocally() {
  const list = syncLogList.value;
  syncStats.total = list.length;
  syncStats.success = list.filter((l) => String(l.status) === 'SUCCESS' || String(l.status) === '1').length;
  syncStats.partial = list.filter((l) => String(l.status) === 'PARTIAL' || String(l.status) === '2').length;
  syncStats.failed = list.filter((l) => String(l.status) === 'FAILED' || String(l.status) === '3').length;
  syncStats.units = list.reduce((sum, l) => sum + (Number(l.successCount) || 0), 0);
}
async function loadSyncStats() {
  try {
    const res: any = await provincialSyncStats();
    Object.assign(syncStats, res?.data ?? {});
  } catch {
    calcSyncStatsLocally();
  }
}

// ===== hero 支撑项 + 状态筛选(支撑项点击联动筛选) =====
const syncSupports = computed(() => [
  { key: 'SUCCESS', label: '成功', value: syncStats.success, clickable: true },
  { key: 'PARTIAL', label: '部分失败', value: syncStats.partial, color: SEMANTIC_COLOR.warning, clickable: true },
  { key: 'FAILED', label: '全部失败', value: syncStats.failed, color: SEMANTIC_COLOR.error, clickable: true },
  { key: 'units', label: '累计同步机组', value: syncStats.units },
]);
const syncStatusFilter = ref<string | undefined>(undefined);
const syncStatusOptions = [
  { label: '进行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '部分失败', value: 'PARTIAL' },
  { label: '全部失败', value: 'FAILED' },
];
const filteredSyncLogs = computed(() => {
  if (!syncStatusFilter.value) return syncLogList.value;
  return syncLogList.value.filter((l) => String(l.status) === syncStatusFilter.value);
});
function onSyncSupportClick(key: string) {
  syncStatusFilter.value = syncStatusFilter.value === key ? undefined : key;
}

// ===== 饼图:同步批次状态占比 =====
const pieChartRef = ref<HTMLDivElement | null>(null);
let pieChart: echarts.ECharts | null = null;

function renderPie() {
  if (syncLogList.value.length === 0) return;
  if (!pieChartRef.value) return;
  if (!pieChart) pieChart = echarts.init(pieChartRef.value);
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 次 ({d}%)' },
    series: [
          {
            name: '同步状态',
            type: 'pie',
            radius: ['38%', '65%'],
            center: ['50%', '45%'],
            label: { formatter: '{b}\n{c} 次' },
            data: [
              { value: syncStats.success, name: '成功', itemStyle: { color: '#bfbfbf' } },
              { value: syncStats.partial, name: '部分失败', itemStyle: { color: SEMANTIC_COLOR.warning } },
              { value: syncStats.failed, name: '全部失败', itemStyle: { color: SEMANTIC_COLOR.error } },
            ],
      },
    ],
  });
}

async function loadSyncLogs() {
  syncLoading.value = true;
  try {
    const res: any = await provincialSyncList({ pageNum: 1, pageSize: 999 });
    syncLogList.value = res?.data?.list ?? [];
    syncTotal.value = res?.data?.total ?? 0;
    await loadSyncStats();
    await nextTick();
    renderPie();
  } catch (e: any) {
    message.error(e?.message || '同步日志加载失败');
  } finally {
    syncLoading.value = false;
  }
}

const syncDetailVisible = ref(false);
const currentSync = ref<any>(null);
const syncDetailList = ref<any[]>([]);
const syncDetailLoading = ref(false);
const syncDetailColumns = [
  { title: '设备名称', dataIndex: 'name', width: 170, ellipsis: true },
  { title: '厂站', dataIndex: 'stationName', width: 150, ellipsis: true },
  { title: '机组类型', dataIndex: 'gnType', width: 90 },
  { title: '区域', dataIndex: 'areaName', width: 90 },
  { title: 'P max(MW)', dataIndex: 'pmax', width: 95 },
  { title: 'P min(MW)', dataIndex: 'pmin', width: 95 },
  { title: '额定容量', dataIndex: 'mvarate', width: 90 },
  { title: '采样时间', dataIndex: 'sampleTime', width: 145 },
];
const GN_TYPE: Record<string, string> = {
  thermal: '火电', hydro: '水电', pumped_storage: '抽蓄', nuclear: '核电', gas: '燃气',
  biomass: '生物质', wind: '风电', solar: '光伏', storage: '储能',
};
function gnTypeLabel(v: string) { return GN_TYPE[String(v)] || v || '-'; }

function onViewSyncDetail(record: any) {
  currentSync.value = record;
  syncDetailVisible.value = true;
  // 按日志起止时间窗拉取逐条机组同步记录(时间窗关联)
  syncDetailList.value = [];
  syncDetailLoading.value = true;
  provincialSyncDetailList({ startTime: record.startTime, endTime: record.endTime })
    .then((res: any) => { syncDetailList.value = res?.data ?? []; })
    .catch(() => { message.error('同步明细加载失败'); })
    .finally(() => { syncDetailLoading.value = false; });
}

// ============ 差异检查逻辑已收进台账信息页·常州台账 tab(前排行),此处仅保留同步记录 ============

onMounted(loadSyncLogs);
</script>

<style scoped lang="less">
.page-container {
  padding: 16px;
  height: 100%;
  overflow: auto;
}
.tab-inner {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
}
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.total-text {
  color: #999;
  font-size: 12px;
}
.stat-hero-col {
  height: 100%;

  > :deep(.ant-card) {
    height: 100%;
  }
}
.toolbar-label {
  color: #666;
}
.detail-title {
  font-weight: 600;
  margin-bottom: 8px;
}
:deep(.ant-table-tbody) {
  font-variant-numeric: tabular-nums;
}
:deep(.ant-table-tbody) {
  font-variant-numeric: tabular-nums;
}
</style>
