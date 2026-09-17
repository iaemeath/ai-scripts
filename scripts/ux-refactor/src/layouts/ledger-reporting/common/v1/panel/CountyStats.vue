<template>
  <a-card title="县区资源数量统计">
      <a-spin :spinning="loading">
        <!-- 顶部 4 个统计卡片 -->
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="县区总数" :value="stats.areaCount" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="资源总数" :value="stats.totalCount" suffix="条" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="总容量" :value="stats.totalCapacity" :precision="2" suffix="MW" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="Top 县区" :value="stats.topArea || '-'" :value-style="{ fontSize: '20px' }" />
            </a-card>
          </a-col>
        </a-row>

        <a-alert
          v-if="!matrixData"
          type="info"
          show-icon
          message="暂无统计数据"
          description="请确保 CZ_RESOURCE_LEDGER_INFO 表中有数据,且 area_name 字段已填写" />

        <!-- 主表格: 行=县区, 列=设备类型+总容量+总数 -->
        <a-table
          v-else
          :columns="tableColumns"
          :data-source="tableData"
          :pagination="false"
          row-key="areaName"
          size="middle"
          bordered
          :scroll="{ x: 'max-content' }">
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.dataIndex === 'areaName'">
              <strong>{{ record.areaName }}</strong>
            </template>
            <template v-else-if="column.dataIndex === '_total'">
              <a-tag :color="countColor(text?.count)">{{ text?.count ?? 0 }} 条 / {{ formatCap(text?.capacity) }} MW</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'totalCapacityCol'">
              <span style="color: #1677ff; font-weight: bold">{{ formatCap(record._total?.capacity) }} MW</span>
            </template>
            <template v-else>
              <span v-if="text && text.count > 0">
                <div>{{ text.count }} 条</div>
                <div style="color: #888; font-size: 12px">{{ formatCap(text.capacity) }} MW</div>
              </span>
              <span v-else style="color: #ccc">-</span>
            </template>
          </template>
        </a-table>

        <a-alert
          v-if="matrixData"
          type="warning"
          show-icon
          style="margin-top: 12px"
          message="说明"
          description="行级权限(按用户所属县区过滤)未实现,所有用户可见全部县区数据。等业务方明确权限模型后再补。" />
      </a-spin>
    </a-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { countyStats } from '../api/resource';

const loading = ref(false);
const matrixData = ref<any>(null);

const stats = reactive({
  areaCount: 0,
  totalCount: 0,
  totalCapacity: 0,
  topArea: '',
});

const tableColumns = computed(() => {
  if (!matrixData.value) return [];
  const cols: any[] = [{ title: '县区', dataIndex: 'areaName', width: 100, fixed: 'left' }];
  for (const dt of matrixData.value.deviceTypes || []) {
    const label = matrixData.value.deviceTypeLabels?.[dt] || dt;
    cols.push({ title: label, dataIndex: dt, width: 110, align: 'center' });
  }
  cols.push({ title: '总容量', dataIndex: 'totalCapacityCol', width: 130, align: 'center', fixed: 'right' });
  cols.push({ title: '总数', dataIndex: '_total', width: 160, align: 'center', fixed: 'right' });
  return cols;
});

const tableData = computed(() => {
  if (!matrixData.value) return [];
  const rows: any[] = [];
  for (const areaName of matrixData.value.areaNames || []) {
    const row = { areaName, ...(matrixData.value.matrix?.[areaName] || {}), totalCapacityCol: null };
    row.totalCapacityCol = row._total?.capacity ?? 0;
    rows.push(row);
  }
  // 加合计行
  const grand = matrixData.value.grandTotal || { count: 0, capacity: 0 };
  rows.push({
    areaName: '合计',
    ...Object.fromEntries((matrixData.value.deviceTypes || []).map((dt: string) => [dt, { count: 0, capacity: 0 }])),
    _total: { count: grand.count, capacity: grand.capacity },
    totalCapacityCol: grand.capacity,
    _isTotal: true,
  });
  return rows;
});

function countColor(count?: number) {
  if (!count) return 'default';
  if (count >= 100) return 'green';
  if (count >= 50) return 'blue';
  if (count >= 10) return 'orange';
  return 'red';
}

function formatCap(cap?: number) {
  if (cap === null || cap === undefined) return '0.00';
  return Number(cap).toFixed(2);
}

async function loadData() {
  loading.value = true;
  try {
    const res: any = await countyStats();
    const data = res?.data || {};
    matrixData.value = data;
    stats.areaCount = (data.areaNames || []).length;
    stats.totalCount = data.grandTotal?.count || 0;
    stats.totalCapacity = data.grandTotal?.capacity || 0;
    stats.topArea = data.topArea || '';
  } catch (e: any) {
    message.error(e?.message || '县区统计加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="less">
</style>
