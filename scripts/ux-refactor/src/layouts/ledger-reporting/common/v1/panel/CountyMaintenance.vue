<template>
  <div class="tab-inner">
      <a-form layout="inline" :model="query" class="filter-form">
        <a-form-item label="关联模板">
          <a-select v-model:value="query.templateId" placeholder="全部" allow-clear show-search style="width: 240px"
                    :options="tplOptions" :field-names="{label:'templateName',value:'id'}" @change="loadData" />
        </a-form-item>
        <a-form-item label="县区">
          <a-select v-model:value="query.areaName" show-search allow-clear placeholder="请选择" style="width: 160px"
            :filter-option="(input: string, option: any) => option.children?.[0]?.children?.toLowerCase().includes(input.toLowerCase())">
            <a-select-option v-for="a in areaOptions" :key="a.areaName" :value="a.areaName">{{ a.areaName }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="编辑人">
          <a-input v-model:value="query.editBy" allow-clear style="width: 120px" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="query.status" placeholder="全部" allow-clear style="width: 140px" :options="statusOptions" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="onSearch">查询</a-button>
          <a-button style="margin-left: 8px" @click="onReset">重置</a-button>
          <a-button type="primary" style="margin-left: 16px" @click="onNewDraft">新增草稿</a-button>
          <a-button style="margin-left: 8px" @click="loadData">刷新</a-button>
        </a-form-item>
      </a-form>

      <a-alert v-if="total > 0" type="info" show-icon style="margin-bottom: 12px">
        <template #message>
          共 {{ total }} 条草稿 ｜ 待提交: <strong style="color:#faad14">{{ pendingCount }}</strong>
          ｜ 已提交待审: <strong style="color:#1677ff">{{ submittedCount }}</strong>
          ｜ 已通过: <strong style="color:#52c41a">{{ approvedCount }}</strong>
        </template>
      </a-alert>

      <a-table :columns="columns" :data-source="list" :loading="loading" :pagination="{ pageSize: 10, showSizeChanger: true }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="statusTagColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'templateName'">
            {{ tplNameOf(record.templateId) }}
          </template>
          <template v-else-if="column.dataIndex === 'payloadSummary'">
            <a-tooltip :title="formatPayload(record.payload)">
              <span>{{ payloadSummary(record.payload) }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" :disabled="!canSubmit(record.status)" @click="onSubmit(record)">提交</a-button>
            <a-button type="link" size="small" :disabled="!canRevoke(record.status)" @click="onRevoke(record)">撤销</a-button>
            <a-button type="link" size="small" @click="onEdit(record)">查看</a-button>
          </template>
        </template>
      </a-table>

    <a-modal v-model:open="showEdit" :title="editForm.id ? '查看/编辑草稿' : '新增草稿'" width="900px" :confirm-loading="saving" :footer="null">
      <div style="text-align: right; margin-bottom: 12px">
        <a-button style="margin-right: 8px" @click="showEdit = false">取消</a-button>
        <a-button style="margin-right: 8px" :loading="saving" @click="onSave">保存草稿</a-button>
        <a-button type="primary" :loading="saving" @click="onSaveAndSubmit">保存并提交</a-button>
      </div>
      <a-form layout="vertical" :model="editForm">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="关联模板" name="templateId" required>
              <a-select v-model:value="editForm.templateId" :options="tplOptions" :field-names="{label:'templateName',value:'id'}"
                        show-search placeholder="必选,决定下方字段表单" :disabled="!!editForm.id" @change="onTemplateChange" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="目标台账 ID(已存在台账才填,新增台账留空)" name="targetLedgerId">
              <a-input v-model:value="editForm.targetLedgerId" placeholder="已有的台账 ID" allow-clear :disabled="!!editForm.id" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="所属县区" name="areaName" required>
              <a-select v-model:value="editForm.areaName" show-search allow-clear placeholder="请选择"
                :filter-option="(input: string, option: any) => option.children?.[0]?.children?.toLowerCase().includes(input.toLowerCase())">
                <a-select-option v-for="a in areaOptions" :key="a.areaName" :value="a.areaName">{{ a.areaName }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="编辑人" name="editBy">
              <a-input v-model:value="editForm.editBy" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="模板字段数">
              <a-input :value="currentFields.length + ' 项'" disabled />
            </a-form-item>
          </a-col>
        </a-row>

        <template v-if="currentFields.length > 0">
          <a-divider orientation="left">
            字段表单(按模板 <strong>{{ tplNameOf(editForm.templateId) }}</strong> 动态生成)
          </a-divider>
          <a-alert v-if="issues.length" type="warning" show-icon style="margin-bottom: 12px"
                   :message="`完整性校验提醒(${issues.length}项,不拦截保存)`"
                   :description="issues.map((i) => `${i.fieldName}: ${i.message}`).join('；')" />
          <a-row :gutter="16">
            <a-col v-for="f in currentFields" :key="f.name" :span="8">
              <a-form-item :label="fieldLabel(f)" name="name]" >
                <component
                  :is="resolveComponent(f)"
                  v-model:value="payload[f.name]"
                  v-bind="resolveProps(f)"
                  :placeholder="f.desc || `请输入${f.name}`"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </template>
        <a-empty v-else description="请先选择模板" style="margin: 30px 0;" />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  countyEditList, countyEditInfo, countyEditSaveDraft, countyEditSubmit, countyEditRevoke,
  ledgerTemplateList, areaInfoList,
} from '../api/resource';
import { Input, InputNumber, Select, DatePicker, Switch } from 'ant-design-vue';
import { DRAFT_STATUS_OPTIONS, getDraftStatusLabel, getDraftStatusColor, DEVICE_TYPE_OPTIONS, DEVICE_STATUS_OPTIONS } from '../constants/ledger';

const query = reactive({
  templateId: undefined as string | undefined,
  areaName: '', editBy: '',
  status: undefined as string | undefined,
  pageNum: 1, pageSize: 10,
});

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);

const columns = [
  { title: '关联模板', dataIndex: 'templateName', width: 200, ellipsis: true },
  { title: '台账ID', dataIndex: 'targetLedgerId', width: 200, ellipsis: true },
  { title: '县区', dataIndex: 'areaName', width: 100 },
  { title: '编辑人', dataIndex: 'editBy', width: 100 },
  { title: '修改内容', dataIndex: 'payloadSummary' },
  { title: '状态', dataIndex: 'status', width: 110, align: 'center' },
  { title: '更新时间', dataIndex: 'editTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 200, fixed: 'right' },
];

const statusOptions = DRAFT_STATUS_OPTIONS;
function statusLabel(v: string) { return getDraftStatusLabel(v); }
function statusTagColor(v: string) { return getDraftStatusColor(v); }
function canSubmit(v: string) { return v === 'DRAFT' || v === 'REJECTED'; }
function canRevoke(v: string) { return v === 'DRAFT' || v === 'SUBMITTED'; }

const deviceTypeOptions = DEVICE_TYPE_OPTIONS;
const deviceStatusOptions = DEVICE_STATUS_OPTIONS;

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

const pendingCount = computed(() => list.value.filter((i) => String(i.status) === 'DRAFT').length);
const submittedCount = computed(() => list.value.filter((i) => String(i.status) === 'SUBMITTED').length);
const approvedCount = computed(() => list.value.filter((i) => String(i.status) === 'APPROVED').length);

const tplOptions = ref<any[]>([]);
const tplFieldsCache = ref<Record<string, any[]>>({});

const areaOptions = ref<any[]>([]);
async function loadAreaOptions() {
  if (areaOptions.value.length > 0) return;
  try {
    const res: any = await areaInfoList({ pageSize: 999 });
    areaOptions.value = res?.data || [];
  } catch { /* ignore */ }
}

async function loadTplOptions() {
  try {
    const res: any = await ledgerTemplateList({ pageNum: 1, pageSize: 100, enabled: 'Y' });
    const items = res?.data?.list ?? [];
    tplOptions.value = items.map((t: any) => ({
      id: t.id,
      templateName: `${t.templateName} (${t.version || 'v?'})`,
      fieldDefinition: t.fieldDefinition,
    }));
    items.forEach((t: any) => {
      tplFieldsCache.value[t.id] = parseFields(t.fieldDefinition);
    });
  } catch (e) { /* 模板列表加载失败不阻塞主功能（降级为空选项）*/ }
}

function parseFields(json: string): any[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function tplNameOf(id?: string) {
  if (!id) return '-';
  return tplOptions.value.find((t) => t.id === id)?.templateName ?? id.slice(0, 12) + '...';
}

const currentFields = computed<any[]>(() => {
  if (!editForm.templateId) return [];
  return tplFieldsCache.value[editForm.templateId] || [];
});

function fieldLabel(f: any) {
  const desc = f.desc || f.name;
  return f.required ? `${desc} *` : desc;
}

function resolveComponent(f: any) {
  if (f.name === 'deviceType') return Select;
  if (f.name === 'deviceStatus') return Select;
  if (f.type === 'NUMBER') return InputNumber;
  if (f.type === 'BOOLEAN') return Switch;
  if (f.type === 'DATE') return DatePicker;
  return Input;
}

function resolveProps(f: any) {
  if (f.name === 'deviceType') return { options: deviceTypeOptions, allowClear: true, style: 'width:100%' };
  if (f.name === 'deviceStatus') return { options: deviceStatusOptions, allowClear: true, style: 'width:100%' };
  if (f.type === 'NUMBER') return { style: 'width:100%', step: 0.01 };
  if (f.type === 'DATE') return { style: 'width:100%', valueFormat: 'YYYY-MM-DD' };
  return {};
}

async function loadData() {
  loading.value = true;
  try {
    const res: any = await countyEditList(query);
    list.value = res?.data?.list ?? [];
    total.value = res?.data?.total ?? 0;
  } catch (e: any) {
    message.error(e?.message || '查询失败');
  } finally {
    loading.value = false;
  }
}

function onSearch() { query.pageNum = 1; loadData(); }
function onReset() {
  Object.assign(query, { templateId: undefined, areaName: '', editBy: '', status: undefined, pageNum: 1 });
  loadData();
}

const showEdit = ref(false);
const saving = ref(false);
const editForm = reactive<any>({});
const payload = reactive<Record<string, any>>({});
const issues = ref<any[]>([]);

function onNewDraft() {
  if (tplOptions.value.length === 0) {
    message.warning('请先到模板管理页面创建启用的模板');
    return;
  }
  Object.assign(editForm, { id: null, templateId: undefined, targetLedgerId: '', areaName: query.areaName || '', editBy: '' });
  Object.keys(payload).forEach((k) => delete payload[k]);
  issues.value = [];
  showEdit.value = true;
}

async function onEdit(record: any) {
  try {
    const res: any = await countyEditInfo(record.id);
    const d = res?.data ?? record;
    Object.assign(editForm, d);
    Object.keys(payload).forEach((k) => delete payload[k]);
    Object.assign(payload, parsePayload(d.payload));
    issues.value = [];
    showEdit.value = true;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  }
}

function onTemplateChange() {
  Object.keys(payload).forEach((k) => delete payload[k]);
  issues.value = [];
}

async function doSaveDraft(submitAfter: boolean) {
  if (!editForm.templateId) { message.warning('请选择模板'); return; }
  if (!editForm.areaName) { message.warning('请填写县区'); return; }
  if (currentFields.value.length === 0) { message.warning('当前模板字段为空,无法保存'); return; }

  const cleaned: any = {};
  currentFields.value.forEach((f) => {
    const v = payload[f.name];
    if (v !== '' && v !== null && v !== undefined) cleaned[f.name] = v;
  });

  saving.value = true;
  try {
    const res: any = await countyEditSaveDraft({
      targetLedgerId: editForm.targetLedgerId || undefined,
      templateId: editForm.templateId,
      areaName: editForm.areaName,
      editBy: editForm.editBy,
      payload: JSON.stringify(cleaned),
    });
    const draftId = res?.data;
    if (submitAfter && draftId) {
      const submitRes: any = await countyEditSubmit({ draftId });
      issues.value = submitRes?.data?.issues || [];
      if (issues.value.length) {
        message.warning(`已保存并提交,${issues.value.length} 项完整性提醒(不拦截)`);
      } else {
        message.success('已保存并提交,完整性校验通过');
      }
    } else {
      message.success('草稿已保存,可继续编辑或手动提交');
    }
    showEdit.value = false;
    loadData();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function onSave() { await doSaveDraft(false); }
async function onSaveAndSubmit() { await doSaveDraft(true); }

function onSubmit(record: any) {
  Modal.confirm({
    title: '确认提交草稿?',
    content: '提交后进入待审状态,地调用户可审核',
    onOk: async () => {
      try {
        const res: any = await countyEditSubmit({ draftId: record.id });
        const issues = res?.data?.issues || [];
        if (issues.length === 0) message.success('草稿已提交,完整性校验通过');
        else message.warning(`草稿已提交,有 ${issues.length} 项完整性提醒(不拦截)`);
        loadData();
      } catch (e: any) {
        message.error(e?.message || '提交失败');
      }
    },
  });
}

function onRevoke(record: any) {
  Modal.confirm({
    title: '确认撤销草稿?',
    content: '撤销后无法恢复为提交状态',
    onOk: async () => {
      try {
        await countyEditRevoke({ draftId: record.id });
        message.success('已撤销');
        loadData();
      } catch (e: any) {
        message.error(e?.message || '撤销失败');
      }
    },
  });
}

onMounted(async () => {
  await loadTplOptions();
  loadAreaOptions();
  loadData();
});
</script>

<style scoped lang="less">
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
.filter-form { margin-bottom: 12px; }
</style>
