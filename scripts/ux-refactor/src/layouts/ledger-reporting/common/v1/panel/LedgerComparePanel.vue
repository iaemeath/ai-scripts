<template>
  <a-card title="省地台账比对">
    <a-space style="margin-bottom: 12px">
      <a-tag :color="compareSummaryData.dm6Available ? 'green' : 'red'">
        DM6 状态:{{ compareSummaryData.dm6Available ? '已连接' : '不可用' }}
      </a-tag>
      <a-tag>省调机组:{{ compareSummaryData.totalProvincial ?? 0 }}</a-tag>
      <a-tag>本地台账:{{ compareSummaryData.totalLocal ?? 0 }}</a-tag>
      <a-tag color="green">匹配:{{ compareSummaryData.matched ?? 0 }}</a-tag>
      <a-tag color="orange">差异:{{ compareSummaryData.different ?? 0 }}</a-tag>
      <a-tag color="blue">本地独有:{{ compareSummaryData.localOnly ?? 0 }}</a-tag>
      <a-tag color="purple">省调独有:{{ compareSummaryData.provincialOnly ?? 0 }}</a-tag>
    </a-space>

    <a-form layout="inline" style="margin-bottom: 12px">
      <a-form-item label="设备名称">
        <a-input v-model:value="compareFilter.deviceName" placeholder="模糊匹配" allow-clear style="width: 200px" />
      </a-form-item>
      <a-form-item label="比对状态">
        <a-select v-model:value="compareFilter.compareStatus" placeholder="全部" allow-clear style="width: 160px" :options="compareStatusOptions" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadCompare">查询</a-button>
        <a-button style="margin-left: 8px" @click="resetCompareFilter">重置</a-button>
      </a-form-item>
    </a-form>

    <a-alert v-if="!compareSummaryData.dm6Available" type="warning" show-icon style="margin-bottom: 12px"
             message="DM6 数据源不可用,无法比对,请检查省调数据源连接" />

    <a-table
      :columns="compareColumns"
      :data-source="compareList"
      :loading="compareLoading"
      :scroll="{ x: 920 }"
      :pagination="{ pageSize: 10, showSizeChanger: true }"
      row-key="(record) => (record.ledgerId || record.emsId || record.deviceName)"
      size="middle">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'compareStatus'">
          <a-tag :color="compareStatusColor(record.compareStatus)">{{ compareStatusLabel(record.compareStatus) }}</a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'diffFieldCount'">
          <span v-if="record.diffFields && record.diffFields.length" style="color: #fa541c; font-weight: bold">
            {{ record.diffFields.length }} 个字段不一致
          </span>
          <span v-else style="color: #999">-</span>
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <a-button type="link" size="small" @click="onCompareDetail(record)">查看</a-button>
        </template>
      </template>
    </a-table>

    <!-- 比对详情弹窗 -->
    <a-modal v-model:open="detailVisible" title="比对详情" width="800px" :footer="null">
      <a-descriptions v-if="detailRecord" :column="2" bordered size="small" style="margin-bottom: 16px">
        <a-descriptions-item label="设备名">{{ detailRecord.deviceName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="厂站">{{ detailRecord.stationName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="区域">{{ detailRecord.areaName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="比对状态">
          <a-tag :color="compareStatusColor(detailRecord.compareStatus)">{{ compareStatusLabel(detailRecord.compareStatus) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="emsId" :span="2">{{ detailRecord.emsId || '-' }}</a-descriptions-item>
      </a-descriptions>

      <!-- 有差异字段:展示字段级 diff 表 -->
      <template v-if="detailRecord && detailRecord.diffFields && detailRecord.diffFields.length">
        <a-divider orientation="left">字段差异明细 ({{ detailRecord.diffFields.length }} 项)</a-divider>
        <a-table
          :columns="diffFieldColumns"
          :data-source="detailRecord.diffFields"
          :pagination="false"
          row-key="fieldName"
          size="small"
          bordered />
      </template>

      <!-- 无差异字段:展示本地/省调快照 -->
      <template v-else>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-card size="small" title="本地快照">
              <pre style="margin: 0; font-size: 12px">{{ JSON.stringify(detailRecord?.localSnapshot, null, 2) }}</pre>
            </a-card>
          </a-col>
          <a-col :span="12">
            <a-card size="small" title="省调快照">
              <pre style="margin: 0; font-size: 12px">{{ JSON.stringify(detailRecord?.provincialSnapshot, null, 2) }}</pre>
            </a-card>
          </a-col>
        </a-row>
      </template>
    </a-modal>
  </a-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { compareWithProvincial, compareSummary } from '../api/resource';
import { COMPARE_STATUS, COMPARE_STATUS_COLOR } from '../constants/ledger';

const compareSummaryData = ref<any>({});
const compareList = ref<any[]>([]);
const compareLoading = ref(false);
const compareFilter = reactive({ deviceName: '', compareStatus: '' });
const compareStatusOptions = Object.entries(COMPARE_STATUS).map(([value, label]) => ({ value, label }));

const compareColumns = [
  { title: '设备名', dataIndex: 'deviceName', width: 180 },
  { title: '厂站', dataIndex: 'stationName', width: 180 },
  { title: '区域', dataIndex: 'areaName', width: 100 },
  { title: '比对状态', dataIndex: 'compareStatus', width: 110 },
  { title: '差异字段', dataIndex: 'diffFieldCount', width: 130 },
  { title: 'emsId', dataIndex: 'emsId', width: 140 },
  { title: '操作', dataIndex: 'action', width: 80, fixed: 'right' },
];
const diffFieldColumns = [
  { title: '字段', dataIndex: 'fieldLabel', width: 120 },
  { title: '本地值', dataIndex: 'localValue', customRender: ({ text }: any) => text || '(空)' },
  { title: '省调值', dataIndex: 'provincialValue', customRender: ({ text }: any) => text || '(空)' },
];

function compareStatusLabel(v: string) {
  return COMPARE_STATUS[v as keyof typeof COMPARE_STATUS] ?? v;
}
function compareStatusColor(v: string) {
  return COMPARE_STATUS_COLOR[v] ?? 'default';
}

async function loadCompareSummary() {
  try {
    const res: any = await compareSummary();
    compareSummaryData.value = res?.data ?? {};
  } catch (e: any) {
    console.warn('compareSummary error', e);
  }
}

async function loadCompare() {
  compareLoading.value = true;
  try {
    const params: any = {};
    if (compareFilter.deviceName) params.deviceNameKeyword = compareFilter.deviceName;
    if (compareFilter.compareStatus) params.compareStatus = compareFilter.compareStatus;
    const res: any = await compareWithProvincial(params);
    const data = res?.data ?? {};
    compareList.value = data.items ?? [];
    if (!compareFilter.deviceName && !compareFilter.compareStatus) {
      compareSummaryData.value = {
        dm6Available: data.dm6Available,
        totalProvincial: data.totalProvincial,
        totalLocal: data.totalLocal,
        matched: data.matchedCount,
        different: data.differentCount,
        localOnly: data.localOnlyCount,
        provincialOnly: data.provincialOnlyCount,
      };
    }
  } catch (e: any) {
    message.error(e?.message || '比对加载失败');
  } finally {
    compareLoading.value = false;
  }
}

function resetCompareFilter() {
  compareFilter.deviceName = '';
  compareFilter.compareStatus = '';
  loadCompare();
}

// ===== 比对详情弹窗 =====
const detailVisible = ref(false);
const detailRecord = ref<any>(null);

function onCompareDetail(record: any) {
  detailRecord.value = record;
  detailVisible.value = true;
}

onMounted(() => {
  loadCompareSummary();
  loadCompare();
});
</script>
