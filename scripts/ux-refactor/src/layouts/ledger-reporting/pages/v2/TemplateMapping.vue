<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <a-tab-pane key="template" tab="模板管理">
        <div class="tab-inner">
          <a-form layout="inline" :model="tplQuery" class="filter-form">
            <a-form-item label="模板名">
              <a-input v-model:value="tplQuery.templateName" placeholder="模糊查询" allow-clear style="width: 180px" />
            </a-form-item>
            <a-form-item label="启用">
              <a-select v-model:value="tplQuery.enabled" placeholder="全部" allow-clear style="width: 100px" :options="[{label:'启用',value:'Y'},{label:'停用',value:'N'}]" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="loadTemplates">查询</a-button>
              <a-button style="margin-left: 8px" @click="onResetTpl">重置</a-button>
              <a-button type="primary" ghost style="margin-left: 16px" @click="onAddTpl">新增模板</a-button>
            </a-form-item>
          </a-form>

          <a-table
            :columns="tplColumns"
            :data-source="tplList"
            :loading="tplLoading"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
            :scroll="{ x: 1040 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'enabled'">
                <a-tag :color="record.enabled === 'Y' ? 'green' : 'default'">{{ record.enabled === 'Y' ? '启用' : '停用' }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'fieldCount'">
                {{ parseFields(record.fieldDefinition).length }}
              </template>
              <template v-else-if="column.dataIndex === 'mappedProgress'">
                <a-tooltip title="模板字段已被映射覆盖的数量;未映射字段在上报组装时取不到值">
                  <a-tag v-if="parseFields(record.fieldDefinition).length" :color="mappedOf(record.id) >= parseFields(record.fieldDefinition).length ? 'green' : (mappedOf(record.id) ? 'orange' : 'red')">
                    {{ mappedOf(record.id) }}/{{ parseFields(record.fieldDefinition).length }}
                  </a-tag>
                  <span v-else style="color:#999">-</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="onCheckTpl(record)">合理性检查</a-button>
                <a-button type="link" size="small" @click="onEditTpl(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="onDeleteTpl(record)">删除</a-button>
              </template>
            </template>
            <template #expandedRowRender="{ record }">
              <div v-if="parseFields(record.fieldDefinition).length">
                <a-tag v-for="f in parseFields(record.fieldDefinition)" :key="f.name" style="margin-bottom: 4px">
                  {{ fieldCn(f) }}({{ f.name }}) · {{ fieldTypeLabel(f.type) }}{{ f.required ? ' · 必填' : '' }}
                </a-tag>
              </div>
              <span v-else style="color: #999">该模板暂无字段定义</span>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="mapping" tab="映射管理">
        <div class="tab-inner">
          <a-form layout="inline" :model="mapQuery" class="filter-form">
            <a-form-item label="关联模板">
              <a-select v-model:value="mapQuery.templateId" placeholder="请选择" show-search allow-clear style="width: 260px"
                        :options="tplOptions" :field-names="{label:'templateName',value:'id'}" @change="loadMappings" />
            </a-form-item>
            <a-form-item label="映射名">
              <a-input v-model:value="mapQuery.mappingName" placeholder="模糊查询" allow-clear style="width: 180px" />
            </a-form-item>
            <a-form-item label="启用">
              <a-select v-model:value="mapQuery.enabled" placeholder="全部" allow-clear style="width: 100px" :options="[{label:'启用',value:'Y'},{label:'停用',value:'N'}]" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="loadMappings">查询</a-button>
              <a-button style="margin-left: 8px" @click="onResetMap">重置</a-button>
              <a-button type="primary" ghost style="margin-left: 16px" :disabled="!mapQuery.templateId" @click="onAddMap">新增映射</a-button>
            </a-form-item>
          </a-form>

          <a-alert v-if="mapQuery.templateId" type="info" show-icon style="margin-bottom: 12px">
            <template #message>
              模板字段总数:<strong>{{ templateFields.length }}</strong> ｜ 已映射:<strong style="color: #52c41a">{{ mappedCount }}</strong>
              ｜ 未映射:<strong style="color: #ff4d4f">{{ unmappedFromServer !== null ? unmappedFromServer : unmappedCount }}</strong>
              <span style="color: #999">｜ 与本地列同名的字段自动关联(无需配置);映射记录只用于模板列名与本地列名不一致的场景;已映射字段才会出现在上报数据中</span>
            </template>
          </a-alert>

          <a-table
            :columns="mapColumns"
            :data-source="mapList"
            :loading="mapLoading"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
            :scroll="{ x: 880 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'enabled'">
                <a-tag :color="record.enabled === 'Y' ? 'green' : 'default'">{{ record.enabled === 'Y' ? '启用' : '停用' }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'sourceField'">
                {{ sourceFieldCn(record) }}
              </template>
              <template v-else-if="column.dataIndex === 'targetField'">
                {{ localFieldCn(record.targetField) }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-button type="link" size="small" @click="onEditMap(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="onDeleteMap(record)">删除</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="tplVisible" :title="tplForm.id ? '编辑模板' : '新增模板'" width="900px" @ok="onSubmitTpl" :confirm-loading="tplSubmitting">
      <a-form layout="vertical" :model="tplForm">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="模板名称" name="templateName" required>
              <a-input v-model:value="tplForm.templateName" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="是否启用">
              <a-switch v-model:checked="tplEnabledChecked" checked-children="启用" un-checked-children="停用" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">字段定义</a-divider>
        <div style="margin-bottom: 8px;">
          <a-space>
            <a-button type="dashed" size="small" @click="onAddField">+ 添加字段</a-button>
            <span style="color: #999; font-size: 12px;">说明：必填字段建议至少包含「台账名称」「额定容量(MW)」</span>
          </a-space>
        </div>
        <a-table :columns="fieldColumns" :data-source="fieldList" :pagination="false" row-key="rowKey" size="small" bordered>
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'name'">
              <a-input v-model:value="record.name" placeholder="字段名" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'type'">
              <a-select v-model:value="record.type" :options="fieldTypeOptions" size="small" style="width: 100%" />
            </template>
            <template v-else-if="column.dataIndex === 'required'">
              <a-switch v-model:checked="record.required" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'desc'">
              <a-input v-model:value="record.desc" placeholder="字段描述" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'op'">
              <a-button type="link" size="small" danger @click="onRemoveField(index)">删除</a-button>
            </template>
          </template>
        </a-table>
      </a-form>
    </a-modal>

    <a-modal v-model:open="mapVisible" :title="mapForm.id ? '编辑映射' : '新增映射'" width="640px" @ok="onSubmitMap" :confirm-loading="mapSubmitting">
      <a-form layout="vertical" :model="mapForm">
        <a-form-item label="映射名称" name="mappingName" required>
          <a-input v-model:value="mapForm.mappingName" />
        </a-form-item>
        <a-form-item label="模板字段(source)" name="sourceField" required>
          <a-select v-model:value="mapForm.sourceField" :options="templateFieldOptions" placeholder="请选择" @change="onSourceFieldChange" />
        </a-form-item>
        <a-form-item label="本地字段(target,驼峰)" name="targetField" required>
          <a-select v-model:value="mapForm.targetField" :options="localFieldOptions" placeholder="请选择" show-search />
        </a-form-item>
        <a-form-item label="是否启用">
          <a-switch v-model:checked="mapEnabledChecked" checked-children="启用" un-checked-children="停用" />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="mapForm.remark" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { h } from 'vue';
import {
  ledgerTemplateList, ledgerTemplateInfo, ledgerTemplateSave, ledgerTemplateUpdate, ledgerTemplateDelete,
  ledgerTemplateCheckIntegrity,
  ledgerMappingList, ledgerMappingInfo, ledgerMappingSave, ledgerMappingUpdate, ledgerMappingDelete,
  ledgerMappingCountUnmapped,
} from '../../common/v2/mock/gateway';
import { LEDGER_COLUMN_CN, ledgerFieldLabel } from '../../common/v2/constants/ledger';

const activeTab = ref('template');

const fieldTypeOptions = [
  { label: '字符串', value: 'STRING' },
  { label: '数值', value: 'NUMBER' },
  { label: '日期', value: 'DATE' },
  { label: '布尔', value: 'BOOLEAN' },
  { label: '枚举', value: 'ENUM' },
];

/** 本地字段中文名(台账宽表列白名单+中文名,单一来源 constants/ledger.ts) */
const LOCAL_FIELD_CN = LEDGER_COLUMN_CN;
function localFieldCn(name: string): string {
  return ledgerFieldLabel(name);
}

const localFieldOptions = Object.keys(LOCAL_FIELD_CN).map((s) => ({ label: localFieldCn(s), value: s }));

const tplQuery = reactive({ templateName: '', enabled: undefined as string | undefined, pageNum: 1, pageSize: 10 });
const tplList = ref<any[]>([]);
const tplLoading = ref(false);
const tplColumns = [
  { title: '模板名称', dataIndex: 'templateName', width: 200, ellipsis: true },
  { title: '字段数', dataIndex: 'fieldCount', width: 70, align: 'center' },
  { title: '字段映射', dataIndex: 'mappedProgress', width: 90, align: 'center' },
  { title: '启用', dataIndex: 'enabled', width: 70, align: 'center' },
  { title: '创建时间', dataIndex: 'createDataDateTime', width: 155 },
  { title: '操作', dataIndex: 'action', width: 220, fixed: 'right' },
];

/** 字段映射进度:全量映射(不分页,仅启用项)按模板聚合,支撑模板表"字段映射 x/N"总览列 */
const allMappings = ref<any[]>([]);
const mappedByTemplate = computed(() => {
  const map: Record<string, Set<string>> = {};
  for (const m of allMappings.value) {
    if (m.enabled !== 'Y' || !m.templateId || !m.targetField) continue;
    (map[m.templateId] ??= new Set()).add(m.sourceField);
  }
  return map;
});
function mappedOf(templateId: string): number {
  const tpl = tplList.value.find((t) => t.id === templateId);
  const fields = parseFields(tpl?.fieldDefinition);
  const mapped = mappedByTemplate.value[templateId] ?? new Set<string>();
  return fields.filter((f) => mapped.has(f.name) || LOCAL_FIELD_CN[f.name]).length;
}
async function loadAllMappings() {
  try {
    const res: any = await ledgerMappingList({ pageNum: 1, pageSize: 999 });
    allMappings.value = res?.data?.list ?? [];
  } catch { /* 总览列失败不阻塞 */ }
}

/** 字段中文名:模板字段 desc 即中文名,缺失时回退字段名 */
function fieldCn(f: any): string {
  return f.desc || f.name;
}
function fieldTypeLabel(t?: string): string {
  return fieldTypeOptions.find((o) => o.value === t)?.label ?? (t || '-');
}

async function loadTemplates() {
  tplLoading.value = true;
  try {
    const res: any = await ledgerTemplateList(tplQuery);
    tplList.value = res?.data?.list ?? [];
  } catch (e: any) {
    message.error(e?.message || '查询失败');
  } finally {
    tplLoading.value = false;
  }
}

const tplOptions = computed(() => tplList.value.map((t) => ({ id: t.id, templateName: t.templateName })));
const templateFieldOptions = computed(() => {
  const tpl = tplList.value.find((t) => t.id === mapQuery.templateId);
  return parseFields(tpl?.fieldDefinition).map((f) => ({ label: `${fieldCn(f)} (${f.name})`, value: f.name }));
});

function onResetTpl() {
  Object.assign(tplQuery, { templateName: '', enabled: undefined, pageNum: 1 });
  loadTemplates();
}

async function onCheckTpl(record: any) {
  try {
    const res: any = await ledgerTemplateCheckIntegrity(record.id);
    const data = res?.data ?? {};
    if (data.ok) {
      message.success(data.checkedCount
        ? `检查通过:${data.checkedCount} 条关联台账均满足模板必填要求`
        : (data.message || '该模板暂无关联台账'));
    } else {
      const issues = data.issues || [];
      Modal.info({
        title: `发现 ${issues.length} 项问题(共检查 ${data.checkedCount} 条关联台账)`,
        width: 640,
        content: () => issues.map((i: any) => h('div', { style: 'margin-bottom:4px' }, `[必填缺失] ${i.message}`)),
      });
    }
  } catch (e: any) {
    message.error(e?.message || '检查失败');
  }
}

async function onDeleteTpl(record: any) {
  Modal.confirm({
    title: '确认删除',
    content: `将删除模板"${record.templateName}"`,
    onOk: async () => {
      try {
        await ledgerTemplateDelete([record.id]);
        message.success('已删除');
        loadTemplates();
      } catch (e: any) {
        message.error(e?.message || '删除失败');
      }
    },
  });
}

const tplVisible = ref(false);
const tplSubmitting = ref(false);
const tplForm = reactive<any>({});
const tplEnabledChecked = ref(true);
const fieldList = ref<any[]>([]);
const fieldColumns = [
  { title: '字段名', dataIndex: 'name', width: '25%' },
  { title: '类型', dataIndex: 'type', width: '20%' },
  { title: '必填', dataIndex: 'required', width: 80, align: 'center' },
  { title: '描述', dataIndex: 'desc' },
  { title: '操作', dataIndex: 'op', width: 80, align: 'center' },
];
let fieldRowKey = 1;

function parseFields(json: string): any[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function onAddTpl() {
  Object.assign(tplForm, { id: null, templateName: '' });
  tplEnabledChecked.value = true;
  // 默认预置两个核心必填字段,可增删改
  fieldList.value = [
    { name: 'deviceName', type: 'STRING', required: true, desc: '台账名称', rowKey: fieldRowKey++ },
    { name: 'ratedCapacity', type: 'NUMBER', required: true, desc: '额定容量(MW)', rowKey: fieldRowKey++ },
  ];
  tplVisible.value = true;
}

async function onEditTpl(record: any) {
  try {
    const res: any = await ledgerTemplateInfo(record.id);
    const d = res?.data ?? record;
    Object.assign(tplForm, d);
    tplEnabledChecked.value = d.enabled === 'Y';
    fieldList.value = parseFields(d.fieldDefinition).map((f: any) => ({ ...f, rowKey: fieldRowKey++ }));
    tplVisible.value = true;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  }
}

function onAddField() {
  fieldList.value.push({ name: '', type: 'STRING', required: false, desc: '', rowKey: fieldRowKey++ });
}

function onRemoveField(index: number) {
  fieldList.value.splice(index, 1);
}

async function onSubmitTpl() {
  if (!tplForm.templateName) { message.warning('请填写模板名称'); return; }
  const hasEmpty = fieldList.value.some((f) => !f.name);
  if (hasEmpty) { message.warning('存在未命名字段'); return; }
  const dup = fieldList.value.map((f) => f.name).some((n, i, arr) => arr.indexOf(n) !== i);
  if (dup) { message.warning('存在重复字段名'); return; }

  tplSubmitting.value = true;
  try {
    const payload: any = {
      id: tplForm.id || undefined,
      templateName: tplForm.templateName,
      enabled: tplEnabledChecked.value ? 'Y' : 'N',
      fieldDefinition: JSON.stringify(fieldList.value.map(({ rowKey, ...rest }: any) => rest)),
    };
    if (tplForm.id) await ledgerTemplateUpdate(payload);
    else await ledgerTemplateSave(payload);
    message.success('已保存');
    tplVisible.value = false;
    loadTemplates();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    tplSubmitting.value = false;
  }
}

const mapQuery = reactive({ templateId: undefined as string | undefined, mappingName: '', enabled: undefined as string | undefined, pageNum: 1, pageSize: 10 });
const mapList = ref<any[]>([]);
const mapLoading = ref(false);
const mapColumns = [
  { title: '映射名称', dataIndex: 'mappingName', width: 180, ellipsis: true },
  { title: '模板字段', dataIndex: 'sourceField', width: 190, ellipsis: true },
  { title: '本地字段', dataIndex: 'targetField', width: 190, ellipsis: true },
  { title: '启用', dataIndex: 'enabled', width: 80, align: 'center' },
  { title: '更新时间', dataIndex: 'updateDataDateTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 140, fixed: 'right' },
];

/** 映射行的模板字段中文名:按行模板+sourceField 回查字段定义 */
function sourceFieldCn(record: any): string {
  const tpl = tplList.value.find((t) => t.id === record.templateId);
  const f = parseFields(tpl?.fieldDefinition).find((x) => x.name === record.sourceField);
  return f ? `${fieldCn(f)}(${record.sourceField})` : record.sourceField;
}

const templateFields = computed(() => {
  const tpl = tplList.value.find((t) => t.id === mapQuery.templateId);
  return parseFields(tpl?.fieldDefinition);
});
/** 已映射 = 显式映射记录 ∪ 与本地列同名的自动关联字段 */
const mappedCount = computed(() => templateFields.value.filter((f) => isMapped(f.name)).length);
const unmappedCount = computed(() => templateFields.value.length - mappedCount.value);
function isMapped(fieldName: string): boolean {
  if (LOCAL_FIELD_CN[fieldName]) return true; // 同名自动关联
  return mapList.value.some((m) => m.enabled === 'Y' && m.targetField && m.sourceField === fieldName);
}
// 后端权威未映射字段数(基于 DB 查询,与 computed 互为校验)
const unmappedFromServer = ref<number | null>(null);

async function loadMappings() {
  if (!mapQuery.templateId) {
    mapList.value = [];
    return;
  }
  mapLoading.value = true;
  try {
    const res: any = await ledgerMappingList(mapQuery);
    mapList.value = res?.data?.list ?? [];
    // 同步查询后端权威未映射数(需求功能4:统计未映射数量)
    try {
      const cnt: any = await ledgerMappingCountUnmapped(mapQuery.templateId);
      unmappedFromServer.value = typeof cnt?.data === 'number' ? cnt.data : null;
    } catch { unmappedFromServer.value = null; }
  } catch (e: any) {
    message.error(e?.message || '查询失败');
  } finally {
    mapLoading.value = false;
  }
}

function onResetMap() {
  Object.assign(mapQuery, { templateId: undefined, mappingName: '', enabled: undefined, pageNum: 1 });
  mapList.value = [];
}

const mapVisible = ref(false);
const mapSubmitting = ref(false);
const mapForm = reactive<any>({});
const mapEnabledChecked = ref(true);

function onAddMap() {
  Object.assign(mapForm, { id: null, mappingName: '', sourceField: undefined, targetField: undefined, remark: '' });
  mapEnabledChecked.value = true;
  mapVisible.value = true;
}

/** 与本地列同名的字段自动关联(组装按同名直取),不落恒等映射记录 */
function onSourceFieldChange(source?: string) {
  if (source && LOCAL_FIELD_CN[source]) {
    mapForm.sourceField = undefined;
    message.info(`「${LOCAL_FIELD_CN[source]}」与本地列同名,组装时自动关联,无需创建映射`);
  }
}

async function onEditMap(record: any) {
  try {
    const res: any = await ledgerMappingInfo(record.id);
    const d = res?.data ?? record;
    Object.assign(mapForm, d);
    mapEnabledChecked.value = d.enabled === 'Y';
    mapVisible.value = true;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  }
}

async function onSubmitMap() {
  if (!mapQuery.templateId) { message.warning('请先选择模板'); return; }
  if (!mapForm.mappingName) { message.warning('请填写映射名称'); return; }
  if (!mapForm.sourceField) { message.warning('请选择模板字段'); return; }
  if (!mapForm.targetField) { message.warning('请选择本地字段'); return; }
  // 仅统一字段(宽表列)的同名自映射被自动关联取代;特有字段的同名自映射=原样上报声明,允许
  if (mapForm.sourceField === mapForm.targetField && LEDGER_COLUMN_CN[mapForm.sourceField]) {
    message.warning('统一字段与本地列同名时自动关联,无需创建映射记录');
    return;
  }
  mapSubmitting.value = true;
  try {
    const payload = {
      id: mapForm.id || undefined,
      mappingName: mapForm.mappingName,
      templateId: mapQuery.templateId,
      sourceField: mapForm.sourceField,
      targetField: mapForm.targetField,
      enabled: mapEnabledChecked.value ? 'Y' : 'N',
      remark: mapForm.remark,
    };
    if (mapForm.id) await ledgerMappingUpdate(payload);
    else await ledgerMappingSave(payload);
    message.success('已保存');
    mapVisible.value = false;
    loadMappings();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    mapSubmitting.value = false;
  }
}

async function onDeleteMap(record: any) {
  Modal.confirm({
    title: '确认删除',
    content: `将删除映射"${record.mappingName}"`,
    onOk: async () => {
      try {
        await ledgerMappingDelete([record.id]);
        message.success('已删除');
        loadMappings();
      } catch (e: any) {
        message.error(e?.message || '删除失败');
      }
    },
  });
}

onMounted(async () => {
  await loadTemplates();
  loadAllMappings();
  // 默认选中首个模板并加载其映射，避免进页面后映射表空窗
  if (!mapQuery.templateId && tplList.value.length) {
    mapQuery.templateId = tplList.value[0].id;
  }
  loadMappings();
});
</script>

<style scoped lang="less">
.page-container { padding: 16px; height: 100%; overflow: auto; }
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
.filter-form { margin-bottom: 12px; }
</style>
