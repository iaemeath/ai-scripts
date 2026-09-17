<template>
  <div class="tab-inner">
    <a-card title="县区资源数量统计" size="small">
      <a-spin :spinning="loading">
        <!-- 顶部 4 个统计卡片 -->
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :span="6"><a-card size="small"><a-statistic title="县区总数" :value="stats.areaCount" /></a-card></a-col>
          <a-col :span="6"><a-card size="small"><a-statistic title="资源总数" :value="stats.totalCount" suffix="条" /></a-card></a-col>
          <a-col :span="6"><a-card size="small"><a-statistic title="总容量" :value="stats.totalCapacity" :precision="2" suffix="MW" /></a-card></a-col>
          <a-col :span="6"><a-card size="small"><a-statistic title="Top 县区" :value="stats.topArea || '-'" /></a-card></a-col>
        </a-row>

        <a-alert v-if="!matrixData" type="info" show-icon message="暂无统计数据" style="margin-bottom: 12px" />

        <!-- 主表格: 行=县区, 列=设备类型+总容量+总数 -->
        <a-table
          v-else
          :columns="tableColumns"
          :data-source="tableData"
          :pagination="false"
          row-key="areaName"
          size="small"
          bordered
          :scroll="{ x: 'max-content' }">
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.dataIndex === 'areaName'">
              <strong>{{ record.areaName }}</strong>
            </template>
            <template v-else-if="column.dataIndex === '_total'">
              <span>{{ text?.count ?? 0 }} 条 / {{ capText(text?.capacity) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'totalCapacityCol'">
              <span style="color: #1677ff; font-weight: bold">{{ capText(record._total?.capacity) }}</span>
            </template>
            <template v-else>
              <span v-if="text && text.count > 0">
                <div>{{ text.count }} 条</div>
                <div style="color: #888; font-size: 12px">{{ capText(text.capacity) }}</div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { countyStats } from '../mock/gateway';

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
  const cols: any[] = [{ title: '县区', dataIndex: 'areaName', width: 100 }];
  for (const dt of matrixData.value.deviceTypes || []) {
    cols.push({ title: matrixData.value.deviceTypeLabels?.[dt] || dt, dataIndex: dt, width: 110, align: 'center' });
  }
  cols.push({ title: '总容量', dataIndex: 'totalCapacityCol', width: 130, align: 'center' });
  cols.push({ title: '总数', dataIndex: '_total', width: 160, align: 'center' });
  return cols;
});

const tableData = computed(() => {
  if (!matrixData.value) return [];
  const rows: any[] = [];
  for (const areaName of matrixData.value.areaNames || []) {
    rows.push({ areaName, ...(matrixData.value.matrix?.[areaName] || {}), totalCapacityCol: null });
  }
  const grand = matrixData.value.grandTotal || { count: 0, capacity: 0 };
  rows.push({
    areaName: '合计',
    ...Object.fromEntries((matrixData.value.deviceTypes || []).map((dt: string) => [dt, { count: 0, capacity: 0 }])),
    _total: { count: grand.count, capacity: grand.capacity },
    totalCapacityCol: grand.capacity,
  });
  return rows;
});

function formatCap(cap?: number) {
  if (cap === null || cap === undefined) return '0.00';
  return Number(cap).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** 容量展示:0 视为"无容量(线路类)",与未采集区分,避免满屏 0.00 噪声 */
function capText(cap?: number | null): string {
  return Number(cap ?? 0) > 0 ? `${formatCap(cap ?? 0)} MW` : '—';
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
  } catch { /* 统计加载失败不阻塞 */ } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="less">
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
</style>
