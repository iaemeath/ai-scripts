<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <a-tab-pane key="pending" tab="待审草稿">
        <div class="tab-inner">
          <div class="action-bar">
            <a-space>
              <a-button @click="loadPending">刷新</a-button>
            </a-space>
            <span class="total-text">共 {{ pendingTotal }} 条待审</span>
          </div>
          <a-table :columns="pendingColumns" :data-source="pendingList" :loading="pendingLoading" :scroll="{ x: 920 }" :pagination="{ pageSize: 10, showSizeChanger: true }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'payloadSummary'">
                <a-tooltip :title="formatPayload(record.payload)">
                  <span>{{ payloadSummary(record.payload) }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="onApprove(record)">通过</a-button>
                <a-button type="link" size="small" danger @click="onReject(record)">驳回</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="history" tab="归档历史">
        <div class="tab-inner">
          <a-form layout="inline" :model="historyQuery" style="margin-bottom: 12px">
            <a-form-item label="审核状态">
              <a-select v-model:value="historyQuery.reviewStatus" placeholder="全部" allow-clear style="width: 140px" :options="reviewStatusOptions" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="loadHistory">查询</a-button>
              <a-button style="margin-left: 8px" @click="loadHistory">刷新</a-button>
            </a-form-item>
          </a-form>
          <a-table :columns="historyColumns" :data-source="historyList" :loading="historyLoading" :scroll="{ x: 1070 }" :pagination="{ pageSize: 10, showSizeChanger: true }" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'archiveType'">
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
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="remind" tab="催办">
        <div class="tab-inner">
          <a-alert
            v-if="remindLatest"
            :type="remindLatest.overdueCount > 0 ? 'error' : 'success'"
            show-icon
            style="margin-bottom: 12px">
            <template #message>
              最近催办:{{ remindLatest.remindTime }}
              ｜ 批次:{{ remindLatest.remindBatch }}
              ｜ 超期未归档:<strong :style="remindLatest.overdueCount > 0 ? 'color:#fa541c' : 'color:#52c41a'">{{ remindLatest.overdueCount }}</strong>
              条(超过 {{ remindLatest.withinDays }} 天)
              ｜ 状态:{{ remindStatusLabel(remindLatest.status) }}
            </template>
            <template #description>{{ remindLatest.remark || '-' }}</template>
          </a-alert>

          <a-form layout="inline" style="margin-bottom: 12px">
            <a-form-item label="超过(天)">
              <a-input-number v-model:value="withinDays" :min="1" :max="90" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="loadUnarchived">查询</a-button>
              <a-button style="margin-left: 8px" :loading="remindTriggering" @click="onTriggerRemind">立即催办</a-button>
            </a-form-item>
          </a-form>

          <a-alert v-if="unarchivedList.length > 0" type="warning" show-icon style="margin-bottom: 12px"
                   :message="`发现 ${unarchivedTotal} 条超期未归档台账(超过 ${withinDays} 天)`"
                   description="建议:督促县调用户完善字段,提交归档审核" />

          <a-table :columns="unarchivedColumns" :data-source="unarchivedList" row-key="id" size="middle" :scroll="{ x: 720 }" :pagination="{ pageSize: 10 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'archiveStatus'">
                <a-tag :color="archiveStatusColor(record.archiveStatus)">{{ archiveStatusLabel(record.archiveStatus) }}</a-tag>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="reviewModal.show" :title="reviewModal.mode === 'approve' ? '审核通过' : '审核驳回'" @ok="onReviewSubmit" :confirm-loading="reviewModal.submitting">
      <a-form layout="vertical">
        <a-form-item label="审核人" name="reviewer" required>
          <a-select v-model:value="reviewModal.reviewer" placeholder="请选择审核人"
                    :options="[{ label: 'admin', value: 'admin' }, { label: '地调值班员', value: '地调值班员' }, { label: '县调值班员', value: '县调值班员' }]" />
        </a-form-item>
        <a-form-item label="审核意见" name="opinion">
          <a-textarea v-model:value="reviewModal.opinion" :rows="3" :maxlength="500" show-count placeholder="填写审核意见,驳回时建议说明原因" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  countyEditList, ledgerArchiveList, ledgerArchiveApprove, ledgerArchiveReject, ledgerArchiveUnarchivedList,
  archiveRemindLatest, archiveRemindTrigger,
} from '../../common/v1/api/resource';
import { REVIEW_STATUS_OPTIONS, getReviewStatusLabel, getReviewStatusColor, getArchiveStatusLabel, getArchiveStatusColor, getArchiveTypeLabel, getSyncStatusLabel } from '../../common/v1/constants/ledger';

const activeTab = ref('pending');

function parsePayload(s: string | null): any {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}
function payloadSummary(s: string | null) {
  const obj = parsePayload(s);
  const keys = Object.keys(obj);
  if (!keys.length) return '-';
  return keys.slice(0, 4).map((k) => `${k}=${obj[k]}`).join(', ') + (keys.length > 4 ? ` 等${keys.length}项` : '');
}
function formatPayload(s: string | null) {
  const obj = parsePayload(s);
  return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('\n');
}

const pendingList = ref<any[]>([]);
const pendingLoading = ref(false);
const pendingTotal = ref(0);
const pendingColumns = [
  { title: '台账ID', dataIndex: 'targetLedgerId', width: 220, ellipsis: true },
  { title: '县区', dataIndex: 'areaName', width: 100 },
  { title: '编辑人', dataIndex: 'editBy', width: 100 },
  { title: '修改内容', dataIndex: 'payloadSummary', width: 200, ellipsis: true },
  { title: '提交时间', dataIndex: 'editTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 140, fixed: 'right' },
];

async function loadPending() {
  pendingLoading.value = true;
  try {
    const res: any = await countyEditList({ status: 'SUBMITTED', pageNum: 1, pageSize: 50 });
    pendingList.value = res?.data?.list ?? [];
    pendingTotal.value = res?.data?.total ?? 0;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    pendingLoading.value = false;
  }
}

const reviewStatusOptions = REVIEW_STATUS_OPTIONS;
function reviewLabel(v: string) { return getReviewStatusLabel(v); }
function reviewTagColor(v: string) { return getReviewStatusColor(v); }

function archiveTypeLabel(v: string) { return getArchiveTypeLabel(v); }

function archiveStatusLabel(v: string) { return getArchiveStatusLabel(v); }
function archiveStatusColor(v: string) { return getArchiveStatusColor(v); }

const reviewModal = reactive({
  show: false, mode: 'approve' as 'approve' | 'reject', draftId: '', reviewer: '', opinion: '', submitting: false,
});

function onApprove(record: any) {
  reviewModal.mode = 'approve';
  reviewModal.draftId = record.id;
  reviewModal.reviewer = '';
  reviewModal.opinion = '';
  reviewModal.show = true;
}
function onReject(record: any) {
  reviewModal.mode = 'reject';
  reviewModal.draftId = record.id;
  reviewModal.reviewer = '';
  reviewModal.opinion = '';
  reviewModal.show = true;
}

async function onReviewSubmit() {
  if (!reviewModal.reviewer) { message.warning('请填写审核人'); return; }
  reviewModal.submitting = true;
  try {
    const body = { draftId: reviewModal.draftId, reviewer: reviewModal.reviewer, opinion: reviewModal.opinion };
    if (reviewModal.mode === 'approve') {
      await ledgerArchiveApprove(body);
      message.success('已通过,台账已归档');
    } else {
      await ledgerArchiveReject(body);
      message.success('已驳回');
    }
    reviewModal.show = false;
    loadPending();
    loadHistory();
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  } finally {
    reviewModal.submitting = false;
  }
}

const historyQuery = reactive({ reviewStatus: undefined as string | undefined, pageNum: 1, pageSize: 10 });
const historyList = ref<any[]>([]);
const historyLoading = ref(false);
const historyColumns = [
  { title: '台账ID', dataIndex: 'ledgerId', width: 220, ellipsis: true },
  { title: '类型', dataIndex: 'archiveType', width: 80, align: 'center' },
  { title: '归档人', dataIndex: 'archiveBy', width: 100 },
  { title: '归档时间', dataIndex: 'archiveTime', width: 160 },
  { title: '审核人', dataIndex: 'reviewer', width: 100 },
  { title: '审核时间', dataIndex: 'reviewTime', width: 160 },
  { title: '审核状态', dataIndex: 'reviewStatus', width: 100, align: 'center' },
  { title: '审核意见', dataIndex: 'reviewOpinion', width: 150, ellipsis: true },
];

async function loadHistory() {
  historyLoading.value = true;
  try {
    const res: any = await ledgerArchiveList(historyQuery);
    historyList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    historyLoading.value = false;
  }
}

const withinDays = ref(7);
const unarchivedList = ref<any[]>([]);
const unarchivedTotal = ref(0);
const remindLatest = ref<any>(null);
const remindTriggering = ref(false);
function remindStatusLabel(v: string) { return getSyncStatusLabel(v); }
const unarchivedColumns = [
  { title: '设备名称', dataIndex: 'deviceName', width: 180, ellipsis: true },
  { title: '厂站', dataIndex: 'stationName', width: 160, ellipsis: true },
  { title: '区域', dataIndex: 'areaName', width: 100 },
  { title: '归档状态', dataIndex: 'archiveStatus', width: 120, align: 'center' },
  { title: '最后更新', dataIndex: 'updateDataDateTime', width: 160 },
];

async function loadUnarchived() {
  try {
    const res: any = await ledgerArchiveUnarchivedList(withinDays.value);
    const data = res?.data ?? {};
    unarchivedList.value = data.list ?? [];
    unarchivedTotal.value = data.total ?? 0;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  }
}

async function loadRemindLatest() {
  try {
    const res: any = await archiveRemindLatest();
    remindLatest.value = res?.data ?? null;
  } catch (e: any) {
    console.warn('load remind latest failed', e);
  }
}

async function onTriggerRemind() {
  remindTriggering.value = true;
  try {
    await archiveRemindTrigger(withinDays.value);
    message.success('已触发催办扫描');
    await loadRemindLatest();
    await loadUnarchived();
  } catch (e: any) {
    message.error(e?.message || '触发失败');
  } finally {
    remindTriggering.value = false;
  }
}

onMounted(() => {
  loadPending();
  loadHistory();
  loadUnarchived();
  loadRemindLatest();
});
</script>

<style scoped lang="less">
.page-container { padding: 16px; height: 100%; overflow: auto; }
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.total-text { color: #888; font-size: 13px; }
</style>
