<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="mainTab" type="card">
      <a-tab-pane key="local" tab="本地台账">
        <div class="tab-inner">
          <a-form layout="inline" :model="query" class="filter-form">
            <a-form-item label="数据来源">
              <a-select v-model:value="query.dataBaseline" placeholder="全部" allow-clear style="width: 120px" :options="baselineShortOptions" />
            </a-form-item>
            <a-form-item label="设备类型">
              <a-select v-model:value="query.deviceType" placeholder="全部" allow-clear style="width: 140px" :options="deviceTypeOptions" />
            </a-form-item>
            <a-form-item label="设备名称">
              <a-input v-model:value="query.deviceName" placeholder="模糊查询" allow-clear style="width: 160px" />
            </a-form-item>
            <a-form-item label="厂站">
              <a-input v-model:value="query.stationName" placeholder="模糊查询" allow-clear style="width: 160px" />
            </a-form-item>
            <a-form-item label="设备状态">
              <a-select v-model:value="query.deviceStatus" placeholder="全部" allow-clear style="width: 120px" :options="deviceStatusOptions" />
            </a-form-item>
            <a-form-item label="归档状态">
              <a-select v-model:value="query.archiveStatus" placeholder="全部" allow-clear style="width: 130px" :options="archiveStatusOptions" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="onSearch">查询</a-button>
              <a-button style="margin-left: 8px" @click="onReset">重置</a-button>
              <a-button type="primary" style="margin-left: 16px" @click="onAdd">新增台账</a-button>
            </a-form-item>
          </a-form>

          <a-table
            :columns="columns"
            :data-source="list"
            :pagination="pagination"
            :loading="loading"
            :scroll="{ x: 1070 }"
            row-key="id"
            size="middle"
            @change="onPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'syncSource'">
                <a-tag :color="syncSourceTagColor(record.syncSource)">{{ syncSourceLabel(record.syncSource) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'deviceType'">
                {{ deviceTypeLabel(record.deviceType) }}
              </template>
              <template v-else-if="column.dataIndex === 'deviceStatus'">
                <a-tag :color="deviceStatusColor(record.deviceStatus)">{{ deviceStatusLabel(record.deviceStatus) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'archiveStatus'">
                <a-tag :color="archiveTagColor(record.archiveStatus)">{{ archiveLabel(record.archiveStatus) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'dataBaseline'">
                <a-tag :color="baselineColor(record.dataBaseline)">{{ baselineShortLabel(record.dataBaseline) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'updateDataDateTime'">
                {{ fmtTime(record.updateDataDateTime) }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="onDetail(record)">详情</a-button>
                <a-button type="link" size="small" @click="onEdit(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="onDeleteOne(record)">删除</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="compare" tab="省地比对">
        <LedgerComparePanel />
      </a-tab-pane>

      <a-tab-pane key="region" tab="属地管理">
        <a-tabs v-model:activeKey="regionSubTab" type="card">
          <a-tab-pane key="stats" tab="县区资源统计">
            <CountyStats />
          </a-tab-pane>
          <a-tab-pane key="maintenance" tab="县调维护">
            <CountyMaintenance />
          </a-tab-pane>
        </a-tabs>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="editVisible" :title="editForm.id ? '编辑台账' : '新增台账'" width="820px" @ok="onSubmit" :confirm-loading="submitting">
      <a-form layout="vertical" :model="editForm">
        <!-- 第一步:选择模板(决定下面表单渲染哪些字段) -->
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="台账模板" name="templateId" required>
              <a-select
                v-model:value="editForm.templateId"
                :options="tplOptions"
                :field-names="{ label: 'templateName', value: 'id' }"
                placeholder="请先选择台账模板,表单将按模板字段动态生成"
                :disabled="!!editForm.id"
                allow-clear
                @change="onTemplateChange"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 第二步:按模板 fieldDefinition 动态渲染字段 -->
        <template v-if="currentFields.length > 0">
          <a-divider orientation="left" style="margin-top: 4px">
            字段表单(按模板 <strong>{{ tplNameOf(editForm.templateId) }}</strong> 动态生成)
          </a-divider>
          <a-row :gutter="16">
            <a-col v-for="f in currentFields" :key="f.name" :span="fieldSpan(f)">
              <a-form-item :label="fieldLabel(f)">
                <component
                  :is="resolveComp(f)"
                  :value="fieldValue(f.name)"
                  @update:value="(v) => setFieldValue(f.name, v)"
                  v-bind="resolveProps(f)"
                  :placeholder="f.desc || `请输入${f.name}`"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </template>
        <a-empty v-else description="请先选择模板,表单将按模板字段动态生成" style="margin: 24px 0" />
      </a-form>
    </a-modal>

    <!-- 详情弹窗:展示台账全部字段(含模板扩展字段) -->
    <a-modal v-model:open="detailVisible" title="台账详情" width="720px" :footer="null">
      <a-descriptions v-if="detailRecord" :column="2" bordered size="small">
        <a-descriptions-item label="台账模板" :span="2">
          {{ tplNameOf(detailRecord.templateId) || '-' }}
        </a-descriptions-item>
        <a-descriptions-item v-for="item in detailFields" :key="item.label" :label="item.label">
          {{ item.value }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import dayjs from 'dayjs';
import { Input, InputNumber, Select, DatePicker, Switch, Textarea } from 'ant-design-vue';
import { ledgerInfoList, ledgerInfoInfo, ledgerInfoSave, ledgerInfoUpdate, ledgerInfoDelete } from '../../common/v1/api/resource';
import { ledgerTemplateList } from '../../common/v1/api/resource';
import { getSyncSourceLabel, DEVICE_TYPE_OPTIONS, DEVICE_STATUS_OPTIONS, getDeviceStatusLabel as getDevStatusLabel, ARCHIVE_STATUS_OPTIONS, getArchiveStatusLabel, getArchiveStatusColor } from '../../common/v1/constants/ledger';
import CountyStats from '../../common/v1/panel/CountyStats.vue';
import CountyMaintenance from '../../common/v1/panel/CountyMaintenance.vue';
import LedgerComparePanel from '../../common/v1/panel/LedgerComparePanel.vue';

const mainTab = ref('local');
const regionSubTab = ref('stats');

// 后端时间为 ISO UTC 串(如 2026-08-24T09:48:20.263+0000),统一本地化显示,空值显示'-'
function fmtTime(t: any) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-';
}

const query = reactive({
  dataBaseline: undefined as string | undefined,
  deviceType: undefined as string | undefined,
  deviceName: '',
  stationName: '',
  deviceStatus: undefined as string | undefined,
  archiveStatus: undefined as string | undefined,
  pageNum: 1,
  pageSize: 10,
});

const list = ref<any[]>([]);
const loading = ref(false);

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
});

const columns = [
  { title: '设备名称', dataIndex: 'deviceName', width: 180, ellipsis: true },
  { title: '厂站', dataIndex: 'stationName', width: 160, ellipsis: true },
  { title: '区域', dataIndex: 'areaName', width: 100 },
  { title: '容量(MW)', dataIndex: 'ratedCapacity', width: 100 },
  { title: '数据来源', dataIndex: 'dataBaseline', width: 100 },
  { title: '归档状态', dataIndex: 'archiveStatus', width: 110 },
  { title: '最后更新', dataIndex: 'updateDataDateTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 160, fixed: 'right' },
];

function syncSourceLabel(v: string) { return getSyncSourceLabel(v); }
function syncSourceTagColor(v: string) {
  const map: Record<string, string> = { D5000_EMS: 'blue', PROVINCIAL: 'cyan', OMS: 'purple', LOCAL: 'orange' };
  return map[String(v)] || 'default';
}

const deviceTypeOptions = DEVICE_TYPE_OPTIONS;
function deviceTypeLabel(v: string) { return DEVICE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? (v || '-'); }

const deviceStatusOptions = DEVICE_STATUS_OPTIONS;
function deviceStatusLabel(v: string) { return getDevStatusLabel(v); }
function deviceStatusColor(v: string) {
  const s = String(v);
  if (s === '1' || s === 'running' || s === '运行') return 'green';
  if (s === '0' || s === 'stopped' || s === '停运') return 'red';
  if (s === '2' || s === 'maintenance' || s === '检修') return 'orange';
  return 'default';
}

const archiveStatusOptions = ARCHIVE_STATUS_OPTIONS;
function archiveLabel(v: string) { return getArchiveStatusLabel(v); }
function archiveTagColor(v: string) { return getArchiveStatusColor(v); }

function baselineColor(v: string) {
  const map: Record<string, string> = { PROVINCIAL: 'blue', LOCAL: 'green', COUNTY: 'orange' };
  return map[String(v)] || 'default';
}
/** 列表/弹窗用简短标签:省调/地调/县调 */
function baselineShortLabel(v: string) {
  const map: Record<string, string> = { PROVINCIAL: '省调', LOCAL: '地调', COUNTY: '县调' };
  return map[String(v)] || '未分类';
}
const baselineShortOptions = [
  { label: '省调', value: 'PROVINCIAL' },
  { label: '地调', value: 'LOCAL' },
  { label: '县调', value: 'COUNTY' },
];

async function loadData() {
  loading.value = true;
  try {
    const res: any = await ledgerInfoList(query);
    const data = res?.data ?? {};
    list.value = data.list ?? [];
    pagination.value.total = data.total ?? 0;
    pagination.value.current = query.pageNum;
  } catch (e: any) {
    message.error(e?.message || '查询失败');
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  query.pageNum = 1;
  loadData();
}
function onReset() {
  Object.assign(query, {
    dataBaseline: undefined, deviceType: undefined, deviceName: '', stationName: '',
    deviceStatus: undefined, archiveStatus: undefined, pageNum: 1,
  });
  loadData();
}
function onPageChange(p: any) {
  query.pageNum = p.current;
  query.pageSize = p.pageSize;
  pagination.value.current = p.current;
  pagination.value.pageSize = p.pageSize;
  loadData();
}

const editVisible = ref(false);
const submitting = ref(false);
const editForm = reactive<any>({});
/** 扩展字段(模板定义的类型特有字段,PO 中无对应列,存入 extraData JSON) */
const extraFields = reactive<Record<string, any>>({});

/**
 * 模板选项 + fieldDefinition 预解析缓存
 * onMounted 时一次性加载全部启用模板,解析 fieldDefinition 存到 cache,避免每次选模板都请求
 */
const tplOptions = ref<any[]>([]);
const tplFieldsCache = reactive<Record<string, any[]>>({});
const tplMap = reactive<Record<string, any>>({});

/** CzLedgerInfoPO 已有的列字段集合(用于区分扩展字段) */
const PO_FIELD_SET = new Set([
  'deviceType', 'emsId', 'deviceName', 'emsStationId', 'stationName', 'kvnom',
  'pmax', 'pmin', 'ratedCapacity', 'ratedCurrent', 'emsStatus', 'runState',
  'deviceStatus', 'areaName', 'emsRegionId', 'divisionId', 'dispatchRelation',
  'manufacturer', 'modelNo', 'commissionDate', 'syncTime', 'syncSource',
  'archiveStatus', 'latestDraftId', 'dataBaseline', 'remark',
]);

/** 当前选中模板对应的字段定义数组 */
const currentFields = computed(() => {
  if (!editForm.templateId) return [];
  return tplFieldsCache[editForm.templateId] || [];
});

function tplNameOf(id: string) {
  return tplMap[id]?.templateName || '';
}

/** 必填标记 */
function fieldLabel(f: any) {
  const desc = f.desc || f.name;
  return f.required ? `${desc} *` : desc;
}

/** 控件占栅格宽度:备注类全宽,其余半宽 */
function fieldSpan(f: any) {
  if (f.name === 'remark') return 24;
  return 12;
}

/**
 * 字段值绑定桥接:
 * - PO 已有列 → editForm[name](直接存到台账主表)
 * - PO 无此列 → extraFields[name](序列化到 EXTRA_DATA JSON)
 */
function fieldValue(name: string) {
  return PO_FIELD_SET.has(name) ? editForm[name] : extraFields[name];
}

/** 设置字段值(双向绑定的 setter,区分 PO 字段和扩展字段) */
function setFieldValue(name: string, value: any) {
  if (PO_FIELD_SET.has(name)) {
    editForm[name] = value;
  } else {
    extraFields[name] = value;
  }
}

/** 根据字段类型/名称解析为对应 Ant Design Vue 组件 */
function resolveComp(f: any) {
  if (f.name === 'deviceType') return Select;
  if (f.name === 'deviceStatus') return Select;
  if (f.name === 'remark') return Textarea;
  if (f.type === 'NUMBER') return InputNumber;
  if (f.type === 'BOOLEAN') return Switch;
  if (f.type === 'DATE') return DatePicker;
  if (f.type === 'ENUM') return Select;
  return Input;
}

/** 根据字段类型/名称解析控件的 props */
function resolveProps(f: any) {
  if (f.name === 'deviceType') return { options: deviceTypeOptions, allowClear: true, style: 'width:100%' };
  if (f.name === 'deviceStatus') return { options: deviceStatusOptions, allowClear: true, style: 'width:100%' };
  if (f.name === 'remark') return { rows: 2 };
  if (f.type === 'NUMBER') return { style: 'width:100%', step: 0.01 };
  if (f.type === 'DATE') return { style: 'width:100%', valueFormat: 'YYYY-MM-DD' };
  if (f.type === 'BOOLEAN') return {};
  // ENUM 类型:把 regex 里的 | 选项拆成 Select options
  if (f.type === 'ENUM' && f.regex) {
    const opts = String(f.regex).split('|').filter(Boolean).map((v) => ({ label: v.trim(), value: v.trim() }));
    return { options: opts, allowClear: true, style: 'width:100%' };
  }
  return {};
}

/** 选模板时:清空扩展字段,自动填充 deviceType */
// 模板类型(TEMPLATE_TYPE: GENERATING_UNIT/FEEDER/NEW_ENERGY/STORAGE) → 设备类型(DEVICE_TYPE)映射
const TPL_DEVICE_TYPE: Record<string, string> = {
  GENERATING_UNIT: 'THERMAL',
  FEEDER: 'OTHER',
  NEW_ENERGY: 'SOLAR',
  STORAGE: 'STORAGE',
};
function onTemplateChange() {
  // 清空旧扩展字段
  Object.keys(extraFields).forEach((k) => delete extraFields[k]);
  // 自动填充设备类型(模板类型映射到 DEVICE_TYPE 枚举名)
  const tpl = tplMap[editForm.templateId];
  if (tpl && tpl.templateType) {
    editForm.deviceType = TPL_DEVICE_TYPE[tpl.templateType] ?? tpl.templateType.toUpperCase();
  }
}

async function loadTplOptions() {
  try {
    const res: any = await ledgerTemplateList({ pageNum: 1, pageSize: 100, enabled: 'Y' });
    const arr = res?.data?.list ?? [];
    tplOptions.value = arr;
    arr.forEach((tpl: any) => {
      tplMap[tpl.id] = tpl;
      // 预解析 fieldDefinition
      let fields: any[] = [];
      try { fields = JSON.parse(tpl.fieldDefinition || '[]'); } catch { fields = []; }
      tplFieldsCache[tpl.id] = fields;
    });
  } catch (e: any) {
    // 模板加载失败不阻塞台账列表
    console.error('加载模板选项失败', e);
  }
}

function resetEditForm() {
  // 清空 editForm 所有 key
  Object.keys(editForm).forEach((k) => { if (k !== 'id') delete editForm[k]; });
  editForm.id = null;
  // 清空扩展字段
  Object.keys(extraFields).forEach((k) => delete extraFields[k]);
}

function onAdd() {
  resetEditForm();
  editVisible.value = true;
}

async function onEdit(record: any) {
  try {
    resetEditForm();
    const res: any = await ledgerInfoInfo(record.id);
    const data = res?.data ?? record;
    // 铺平 PO 字段到 editForm
    Object.keys(data).forEach((k) => {
      if (PO_FIELD_SET.has(k)) {
        editForm[k] = data[k];
      } else if (k === 'templateId' || k === 'id') {
        editForm[k] = data[k];
      }
    });
    editForm.id = data.id;
    editForm.templateId = data.templateId;
    // 反序列化 extraData 到 extraFields
    if (data.extraData) {
      try {
        const parsed = JSON.parse(data.extraData);
        Object.keys(parsed).forEach((k) => { extraFields[k] = parsed[k]; });
      } catch { /* extraData 不是合法 JSON,忽略 */ }
    }
    editVisible.value = true;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  }
}

async function onSubmit() {
  if (!editForm.templateId) {
    message.warning('请先选择台账模板');
    return;
  }
  // 按模板字段定义校验必填
  for (const f of currentFields.value) {
    if (f.required) {
      const v = fieldValue(f.name);
      if (v === undefined || v === null || v === '') {
        message.warning(`请填写必填项: ${f.desc || f.name}`);
        return;
      }
    }
  }
  // 收集扩展字段到 extraData
  const extra: Record<string, any> = {};
  currentFields.value.forEach((f: any) => {
    if (!PO_FIELD_SET.has(f.name)) {
      const v = extraFields[f.name];
      if (v !== undefined && v !== null && v !== '') {
        extra[f.name] = v;
      }
    }
  });
  editForm.extraData = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;

  submitting.value = true;
  try {
    if (editForm.id) {
      await ledgerInfoUpdate(editForm);
      message.success('已保存');
    } else {
      await ledgerInfoSave(editForm);
      message.success('已新增');
    }
    editVisible.value = false;
    loadData();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function onDeleteOne(record: any) {
  Modal.confirm({
    title: '确认删除',
    content: `将删除「${record.deviceName}」(逻辑删除,可恢复)`,
    onOk: async () => {
      try {
        await ledgerInfoDelete([record.id]);
        message.success('已删除');
        loadData();
      } catch (e: any) {
        message.error(e?.message || '删除失败');
      }
    },
  });
}

// ===== 详情弹窗 =====
const detailVisible = ref(false);
const detailRecord = ref<any>(null);

/** 详情弹窗的字段列表:模板公共字段 + 扩展字段(从 extraData 解析) */
const detailFields = computed(() => {
  const rec = detailRecord.value;
  if (!rec) return [];
  const fields: { label: string; value: string }[] = [];
  // 按模板字段定义顺序展示
  const tplFields = rec.templateId ? (tplFieldsCache[rec.templateId] || []) : [];
  // 解析扩展数据
  let extra: Record<string, any> = {};
  if (rec.extraData) {
    try { extra = JSON.parse(rec.extraData); } catch { /* ignore */ }
  }
  // 先展示模板定义的字段(值优先取 PO 字段,其次取扩展字段)
  const seen = new Set<string>();
  for (const f of tplFields) {
    seen.add(f.name);
    const raw = PO_FIELD_SET.has(f.name) ? rec[f.name] : extra[f.name];
    const val = formatFieldValue(f, raw);
    if (val !== '-' || f.name === 'remark') {
      fields.push({ label: f.desc || f.name, value: val });
    }
  }
  // 补充不在模板里的 PO 系统字段(如归档状态/数据来源)
  const extraLabels: Record<string, string> = {
    dataBaseline: '数据来源', archiveStatus: '归档状态',
    deviceStatus: '设备状态', runState: '运行状态',
  };
  for (const [k, label] of Object.entries(extraLabels)) {
    if (!seen.has(k) && rec[k]) {
      let v = rec[k];
      if (k === 'dataBaseline') v = baselineShortLabel(v);
      if (k === 'archiveStatus') v = archiveLabel(v);
      if (k === 'deviceStatus') v = deviceStatusLabel(v);
      fields.push({ label, value: v });
    }
  }
  return fields;
});

/** 格式化字段值:枚举/布尔/日期/数字 → 可读文本 */
function formatFieldValue(f: any, raw: any): string {
  if (raw === undefined || raw === null || raw === '') return '-';
  if (f.type === 'BOOLEAN') return raw === true || raw === 'true' ? '是' : '否';
  if (f.name === 'deviceType') return deviceTypeLabel(raw);
  if (f.name === 'dispatchRelation' || f.name === 'runState') return String(raw);
  return String(raw);
}

async function onDetail(record: any) {
  try {
    const res: any = await ledgerInfoInfo(record.id);
    detailRecord.value = res?.data ?? record;
    detailVisible.value = true;
  } catch (e: any) {
    // 查询失败也展示已有数据
    detailRecord.value = record;
    detailVisible.value = true;
  }
}

onMounted(() => {
  loadData();
  loadTplOptions();
});
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
.filter-form {
  margin-bottom: 12px;
}
</style>
