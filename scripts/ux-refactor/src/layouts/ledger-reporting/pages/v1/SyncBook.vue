<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <!-- ============== Tab 1: 省调同步 ============== -->
      <a-tab-pane key="sync" tab="省调同步">
        <a-card title="省调数据同步">
          <a-space style="margin-bottom: 16px">
            <a-button type="primary" :loading="syncing" @click="onTrigger">立即触发同步</a-button>
            <a-button @click="loadLatest">刷新最新日志</a-button>
          </a-space>

          <a-descriptions v-if="latest" :column="3" bordered size="small" title="最近一次同步">
            <a-descriptions-item label="同步批次">{{ latest.syncBatch }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="statusColor(latest.status)">{{ statusLabel(latest.status) }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="开始时间">{{ latest.startTime }}</a-descriptions-item>
            <a-descriptions-item label="结束时间">{{ latest.endTime }}</a-descriptions-item>
            <a-descriptions-item label="总数">{{ latest.totalCount }}</a-descriptions-item>
            <a-descriptions-item label="成功">{{ latest.successCount }}</a-descriptions-item>
            <a-descriptions-item label="失败">{{ latest.failCount }}</a-descriptions-item>
            <a-descriptions-item label="错误信息" :span="2">{{ latest.errorMsg || '-' }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-tab-pane>

      <!-- ============== Tab 2: 省地比对 ============== -->
      <a-tab-pane key="compare" tab="省地比对">
        <LedgerComparePanel />
      </a-tab-pane>

      <!-- ============== Tab 3: 差异检查 ============== -->
      <a-tab-pane key="diff" tab="差异检查">
        <a-card title="台账差异性检查">
          <a-alert
            v-if="diffSummaryData"
            type="warning"
            show-icon
            style="margin-bottom: 16px">
            <template #message>
              台账总数:<strong>{{ diffSummaryData.totalCount ?? 0 }}</strong>
              ｜ 未上报:<strong style="color: #fa541c">{{ diffSummaryData.unreportedCount ?? 0 }}</strong>
              ｜ 新增台账:<strong style="color: #1677ff">{{ diffSummaryData.newLedgerCount ?? 0 }}</strong>
              ｜ 上报失败:<strong style="color: #faad14">{{ diffSummaryData.failedCount ?? 0 }}</strong>
              ｜ 已归档:{{ diffSummaryData.archivedCount ?? 0 }}
            </template>
          </a-alert>

          <a-tabs v-model:activeKey="diffSubTab">
            <a-tab-pane key="unreported" :tab="`未上报 (${unreportedList.length})`">
              <a-table :columns="diffColumns" :data-source="unreportedList" :loading="diffLoading.unreported"
                       :scroll="{ x: 910 }"
                       :pagination="{ pageSize: 10, showSizeChanger: true }" row-key="id" size="middle">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.dataIndex === 'syncSource'">{{ syncSourceLabel(record.syncSource) }}</template>
                  <template v-else-if="column.dataIndex === 'archiveStatus'">{{ archiveStatusLabel(record.archiveStatus) }}</template>
                </template>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="new" :tab="`新增台账 (${newLedgerList.length})`">
              <a-table :columns="diffColumns" :data-source="newLedgerList" :loading="diffLoading.newLedger"
                       :scroll="{ x: 910 }"
                       :pagination="{ pageSize: 10, showSizeChanger: true }" row-key="id" size="middle">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.dataIndex === 'syncSource'">{{ syncSourceLabel(record.syncSource) }}</template>
                  <template v-else-if="column.dataIndex === 'archiveStatus'">{{ archiveStatusLabel(record.archiveStatus) }}</template>
                </template>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="failed" :tab="`上报失败 (${failedList.length})`">
              <a-table :columns="diffColumns" :data-source="failedList" :loading="diffLoading.failed"
                       :scroll="{ x: 910 }"
                       :pagination="{ pageSize: 10, showSizeChanger: true }" row-key="id" size="middle">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.dataIndex === 'syncSource'">{{ syncSourceLabel(record.syncSource) }}</template>
                  <template v-else-if="column.dataIndex === 'archiveStatus'">{{ archiveStatusLabel(record.archiveStatus) }}</template>
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  provincialSyncTrigger, provincialSyncLatest,
  scanUnreported, scanNewLedger, scanReportFailed, diffSummary,
} from '../../common/v1/api/resource';
import {
  SYNC_SOURCE, getSyncStatusLabel, getArchiveStatusLabel,
} from '../../common/v1/constants/ledger';
import LedgerComparePanel from '../../common/v1/panel/LedgerComparePanel.vue';

const activeTab = ref('sync');

// ============ Sync tab ============
const latest = ref<any>(null);
const syncing = ref(false);

function statusLabel(v: string) { return getSyncStatusLabel(v); }
function statusColor(v: string) {
  const map: Record<string, string> = { RUNNING: 'processing', SUCCESS: 'green', PARTIAL: 'orange', FAILED: 'red' };
  return map[String(v)] || 'default';
}

async function loadLatest() {
  try {
    const res: any = await provincialSyncLatest();
    latest.value = res?.data ?? null;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  }
}

async function onTrigger() {
  syncing.value = true;
  try {
    const res: any = await provincialSyncTrigger();
    const data = res?.data ?? {};
    message.success(`同步完成:${statusLabel(data.status)}(总 ${data.totalCount ?? 0}/成功 ${data.successCount ?? 0}/失败 ${data.failCount ?? 0})`);
    loadLatest();
  } catch (e: any) {
    message.error(e?.message || '触发失败');
  } finally {
    syncing.value = false;
  }
}

// ============ Diff tab ============
const diffSummaryData = ref<any>(null);
const unreportedList = ref<any[]>([]);
const newLedgerList = ref<any[]>([]);
const failedList = ref<any[]>([]);
const diffSubTab = ref('unreported');
const diffLoading = reactive({ unreported: false, newLedger: false, failed: false });

const diffColumns = [
  { title: '设备类型', dataIndex: 'deviceType', width: 100 },
  { title: '设备名称', dataIndex: 'deviceName', width: 200 },
  { title: '厂站', dataIndex: 'stationName', width: 180 },
  { title: '区域', dataIndex: 'areaName', width: 110 },
  { title: '额定容量', dataIndex: 'ratedCapacity', width: 100 },
  { title: '数据来源', dataIndex: 'syncSource', width: 120 },
  { title: '归档状态', dataIndex: 'archiveStatus', width: 100 },
];

function syncSourceLabel(v: string) {
  if (v === null || v === undefined || v === '') return '-';
  return SYNC_SOURCE[v as keyof typeof SYNC_SOURCE] ?? v;
}
function archiveStatusLabel(v: string) { return getArchiveStatusLabel(v); }

async function loadDiffSummary() {
  try {
    const res: any = await diffSummary();
    diffSummaryData.value = res?.data ?? null;
  } catch (e: any) {
    console.warn('diffSummary error', e);
  }
}

async function loadUnreported() {
  diffLoading.unreported = true;
  try {
    const res: any = await scanUnreported();
    unreportedList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '未上报列表加载失败');
  } finally {
    diffLoading.unreported = false;
  }
}

async function loadNewLedger() {
  diffLoading.newLedger = true;
  try {
    const res: any = await scanNewLedger();
    newLedgerList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '新增台账列表加载失败');
  } finally {
    diffLoading.newLedger = false;
  }
}

async function loadFailed() {
  diffLoading.failed = true;
  try {
    const res: any = await scanReportFailed();
    failedList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '上报失败列表加载失败');
  } finally {
    diffLoading.failed = false;
  }
}

async function refreshAll() {
  await Promise.all([
    loadLatest(),
    loadDiffSummary(),
    loadUnreported(),
    loadNewLedger(),
    loadFailed(),
  ]);
}

onMounted(refreshAll);
</script>

<style scoped lang="less">
.page-container {
  padding: 16px;
  height: 100%;
  overflow: auto;
}
</style>
