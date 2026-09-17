<template>
  <div class="tab-inner">
    <!-- 工具栏:默认选中一个县区,展示该县台账信息 -->
    <a-form layout="inline" class="filter-form">
      <a-form-item label="县区">
        <a-select v-model:value="countySel" :options="areaOptions" show-search placeholder="请选择" style="width: 150px" @change="loadData" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="onNewDraft">新增台账申报</a-button>
      </a-form-item>
      <a-form-item>
        <span class="toolbar-hint">共 {{ countyLedgers.length }} 条台账 ｜ 待地调确认申报 {{ pendingList.length }} 条(前排显示) ｜ 修改已有台账请点该行「修改」</span>
      </a-form-item>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="displayList"
      :loading="loading"
      :pagination="{ pageSize: 10, showSizeChanger: true }"
      row-key="id"
      size="middle">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'deviceName'">
          <a-tooltip v-if="record.__pin" :title="draftTip(record)">
            <a-tag :color="pinColor(record.__pin)" class="pin-tag" style="cursor: help">{{ pinLabel(record.__pin) }}</a-tag>
          </a-tooltip>
          <span>{{ record.deviceName }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'deviceType'">
          {{ deviceTypeLabel(record.deviceType) }}
        </template>
        <template v-else-if="column.dataIndex === 'deviceStatus'">
          <a-tag :color="getDeviceStatusTagColor(record.deviceStatus)">{{ deviceStatusLabel(record.deviceStatus) }}</a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'ratedCapacity'">
          {{ Number(record.ratedCapacity) > 0 ? record.ratedCapacity : '—' }}
        </template>
        <template v-else-if="column.dataIndex === 'updateDataDateTime'">
          {{ record.updateDataDateTime || '-' }}
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <template v-if="record.__pin">
            <a-button type="link" size="small" @click="onEdit(record.__draft)">{{ canEditStatus(record.__draft.status) ? '编辑申报' : '查看申报' }}</a-button>
          </template>
          <template v-else>
            <a-button type="link" size="small" @click="onModifyLedger(record)">修改</a-button>
          </template>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="showEdit" :title="draftTitle" width="860px" :confirm-loading="saving"
             :ok-text="viewOnly ? '关 闭' : '上 报'" :ok-button-props="{ style: { display: viewOnly ? 'none' : '' } }"
             @ok="onSave">
      <a-alert v-if="editForm.targetLedgerId && currentTarget" type="info" show-icon style="margin-bottom: 12px"
               :message="`修改对象:${currentTarget.deviceName}(当前容量 ${currentTarget.ratedCapacity ?? '-'} MW / ${deviceTypeLabel(currentTarget.deviceType)})`" />
      <a-form layout="vertical" :model="editForm">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="目标台账(选择=修改已有台账,留空=新增台账)" name="targetLedgerId">
              <a-select
                v-model:value="editForm.targetLedgerId"
                :options="ledgerOptions"
                show-search allow-clear
                placeholder="留空=新增台账"
                option-filter-prop="label"
                :disabled="!!editForm.id"
                @change="onTargetChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="所属县区 *" name="areaName">
              <a-select v-model:value="editForm.areaName" :options="areaOptions" show-search allow-clear placeholder="请选择" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="编辑人" name="editBy">
              <a-input v-model:value="editForm.editBy" placeholder="如:张县调" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left" style="font-size: 13px">台账字段(全字段维护,上报后由地调确认/驳回)</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="台账名称 *" name="deviceName">
              <a-input v-model:value="payload.deviceName" placeholder="如:华润常州#1机组" allow-clear :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属厂站" name="stationName">
              <a-input v-model:value="payload.stationName" placeholder="如:常州电厂" allow-clear :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="设备类型 *" name="deviceType">
              <a-select v-model:value="payload.deviceType" :options="deviceTypeOptions" placeholder="请选择" allow-clear :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="额定容量(MW)" name="ratedCapacity">
              <a-input-number v-model:value="payload.ratedCapacity" style="width: 100%" :min="0" :step="0.1" :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="电压等级(kV)" name="kvnom">
              <a-input-number v-model:value="payload.kvnom" style="width: 100%" :min="0" :step="0.1" :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="出力上限 Pmax(MW)" name="pmax">
              <a-input-number v-model:value="payload.pmax" style="width: 100%" :step="0.1" :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="出力下限 Pmin(MW)" name="pmin">
              <a-input-number v-model:value="payload.pmin" style="width: 100%" :step="0.1" :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="设备状态" name="deviceStatus">
              <a-select v-model:value="payload.deviceStatus" :options="deviceStatusOptions" placeholder="请选择" allow-clear :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="运行状态" name="runState">
              <a-input v-model:value="payload.runState" placeholder="如:并网运行" allow-clear :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="调度关系" name="dispatchRelation">
              <a-select v-model:value="payload.dispatchRelation" :options="dispatchOptions" placeholder="请选择" allow-clear :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="投运日期" name="commissionDate">
              <a-date-picker v-model:value="payload.commissionDate" style="width: 100%" value-format="YYYY-MM-DD" :disabled="viewOnly" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" name="remark">
              <a-textarea v-model:value="payload.remark" :rows="2" :disabled="viewOnly" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 模板特有字段动态区:目标台账所挂模板的非宽表列字段,值随 payload.extra 提交 -->
        <template v-if="targetExtraFields.length">
          <a-divider orientation="left" style="font-size: 13px">模板特有字段</a-divider>
          <a-row :gutter="16">
            <a-col v-for="f in targetExtraFields" :key="f.name" :span="8">
              <a-form-item :label="f.desc || f.name" :required="!!f.required">
                <a-input-number v-if="f.type === 'NUMBER'" v-model:value="extraForm[f.name]" style="width: 100%" :step="0.1" :disabled="viewOnly" />
                <a-date-picker v-else-if="f.type === 'DATE'" v-model:value="extraForm[f.name]" style="width: 100%" value-format="YYYY-MM-DD" :disabled="viewOnly" />
                <a-switch v-else-if="f.type === 'BOOLEAN'" v-model:checked="extraForm[f.name]" :disabled="viewOnly" />
                <a-input v-else v-model:value="extraForm[f.name]" allow-clear :disabled="viewOnly" />
              </a-form-item>
            </a-col>
          </a-row>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  countyEditList, countyEditInfo, countyEditSaveDraft,
  ledgerInfoList, areaInfoList, ledgerTemplateList,
} from '../mock/gateway';
import {
  DEVICE_TYPE_OPTIONS, DEVICE_STATUS_OPTIONS, getDeviceStatusTagColor,
  LEDGER_COLUMN_CN,
} from '../constants/ledger';
import { currentUser } from '../utils/user';

// ===== 工具栏:县区选择(默认首个县区) =====
const countySel = ref<string | undefined>(undefined);
const areaOptions = ref<any[]>([]);
async function loadAreaOptions() {
  if (areaOptions.value.length > 0) return;
  try {
    const res: any = await areaInfoList({});
    areaOptions.value = (res?.data ?? []).map((a: any) => ({ label: a.areaName, value: a.areaName }));
    if (!countySel.value && areaOptions.value.length) countySel.value = areaOptions.value[0].value;
  } catch { /* ignore */ }
}

const deviceTypeOptions = DEVICE_TYPE_OPTIONS;
const deviceStatusOptions = DEVICE_STATUS_OPTIONS;
const dispatchOptions = ['省调调度', '地调调度', '县调调度'].map((v) => ({ label: v, value: v }));
function deviceTypeLabel(v?: string) { return DEVICE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? (v || '-'); }
function deviceStatusLabel(v?: string) {
  const item = DEVICE_STATUS_OPTIONS.find((o) => o.value === String(v));
  if (item) return item.label;
  if (v === 'running') return '运行';
  if (v === 'stopped') return '停运';
  if (v === 'maintenance') return '检修';
  return String(v ?? '-');
}

const loading = ref(false);
const columns = [
  { title: '设备名称', dataIndex: 'deviceName', width: 240, ellipsis: true },
  { title: '厂站', dataIndex: 'stationName', width: 150, ellipsis: true },
  { title: '设备类型', dataIndex: 'deviceType', width: 100 },
  { title: '容量(MW)', dataIndex: 'ratedCapacity', width: 95, align: 'right' },
  { title: '设备状态', dataIndex: 'deviceStatus', width: 95, align: 'center' },
  { title: '最后更新', dataIndex: 'updateDataDateTime', width: 155 },
  { title: '操作', dataIndex: 'action', width: 110, fixed: 'right' },
];

const PIN_META: Record<string, { label: string; color: string }> = {
  'county-edit': { label: '县调修改', color: 'orange' },
  'county-new': { label: '县调新增', color: 'purple' },
};
function pinLabel(pin: string) { return PIN_META[pin]?.label ?? pin; }
function pinColor(pin: string) { return PIN_META[pin]?.color ?? 'default'; }
/** 待地调确认的申报可编辑(驳回改后再报),已确认只能查看 */
function canEditStatus(v: string) { return v === 'PENDING' || v === 'REJECTED'; }

// ===== 数据:该县台账 + 待确认申报(前排) =====
const allLedgers = ref<any[]>([]);
const pendingList = ref<any[]>([]);

async function loadData() {
  if (!countySel.value) return;
  loading.value = true;
  try {
    const [ledRes, draftRes]: any = await Promise.all([
      ledgerInfoList({ pageNum: 1, pageSize: 999 }),
      countyEditList({ status: 'PENDING', pageNum: 1, pageSize: 999 }),
    ]);
    allLedgers.value = ledRes?.data?.list ?? [];
    pendingList.value = (draftRes?.data?.list ?? []).filter((d: any) => d.areaName === countySel.value);
  } catch (e: any) {
    message.error(e?.message || '查询失败');
  } finally {
    loading.value = false;
  }
}

function parsePayload(s: string | null): any {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}

const countyLedgers = computed(() => allLedgers.value.filter((l) => l.areaName === countySel.value));

/** 前排:该县待地调确认的申报(修改/新增),参考常州台账差异前排
 *  修改类申报 payload 只存变更字段,缺省字段回配现值台账(先按 targetLedgerId,再按台账名称)展示,避免整行 '-' */
const frontRows = computed(() => pendingList.value.map((d) => {
  const payload = parsePayload(d.payload);
  const led = resolveCurrentLedger(d, payload);
  return {
    id: 'draft-' + d.id,
    __pin: d.targetLedgerId || led ? 'county-edit' : 'county-new',
    __draft: d,
    deviceName: payload.deviceName || d.deviceName || '(未命名)',
    stationName: payload.stationName ?? led?.stationName,
    deviceType: payload.deviceType ?? led?.deviceType,
    ratedCapacity: payload.ratedCapacity ?? led?.ratedCapacity,
    deviceStatus: payload.deviceStatus ?? led?.deviceStatus,
    updateDataDateTime: d.editTime,
  };
}));

/** 申报对应的现值台账:优先 targetLedgerId,其次按台账名称同名单配(种子/历史申报无主时兜底) */
function resolveCurrentLedger(draft: any, payload: any): any {
  if (draft.targetLedgerId) return ledgerMap[draft.targetLedgerId] ?? null;
  const name = payload.deviceName || draft.deviceName;
  return countyLedgers.value.find((l) => l.deviceName === name) ?? null;
}

/** 前排申报行说明:申报值 vs 现生效值 */
function draftTip(record: any): string {
  const led = resolveCurrentLedger(record.__draft, parsePayload(record.__draft.payload));
  if (record.__pin === 'county-edit' && led) {
    return `修改申报待地调确认:现生效 ${led.ratedCapacity ?? '-'} MW / ${deviceTypeLabel(led.deviceType)};确认后申报值生效,驳回后维持现值`;
  }
  return '新增申报待地调确认:确认后创建台账,驳回后不落库';
}

const displayList = computed(() => [...frontRows.value, ...countyLedgers.value]);

// ===== 申报弹窗(新增/修改/查看) =====
const showEdit = ref(false);
const saving = ref(false);
const viewOnly = ref(false);
const draftTitle = computed(() => {
  if (viewOnly.value) return '查看申报';
  if (editForm.id) return '修改台账申报';
  // 对已有台账发起的修改申报(尚未生成申报单)
  return editForm.targetLedgerId ? '台账修改申报' : '新增台账申报';
});
const editForm = reactive<any>({});
const payload = reactive<Record<string, any>>({});

const EMPTY_FORM = () => ({
  id: null as string | null, targetLedgerId: undefined as string | undefined,
  areaName: undefined as string | undefined, editBy: '',
});

function onNewDraft() {
  Object.assign(editForm, EMPTY_FORM(), { areaName: countySel.value, editBy: currentUser() });
  Object.keys(payload).forEach((k) => delete payload[k]);
  viewOnly.value = false;
  showEdit.value = true;
}

/** 县调点台账行「修改」:同台账已有待确认申报则直接打开该申报(互斥,避免多头申报),否则新建 */
function onModifyLedger(record: any) {
  const existing = pendingList.value.find((d) => d.targetLedgerId === record.id);
  if (existing) {
    message.info('该台账已有待地调确认的申报,已为您打开原申报继续编辑(上报后覆盖原申报)');
    onEdit(existing);
    return;
  }
  Object.assign(editForm, EMPTY_FORM(), { targetLedgerId: record.id, areaName: record.areaName || countySel.value, editBy: currentUser() });
  Object.keys(payload).forEach((k) => delete payload[k]);
  fillFromLedger(record);
  viewOnly.value = false;
  showEdit.value = true;
}

async function onEdit(record: any) {
  try {
    const res: any = await countyEditInfo(record.id);
    const d = res?.data ?? record;
    Object.assign(editForm, EMPTY_FORM(), { id: d.id, targetLedgerId: d.targetLedgerId ?? undefined, areaName: d.areaName, editBy: d.editBy });
    Object.keys(payload).forEach((k) => delete payload[k]);
    Object.assign(payload, parsePayload(d.payload));
    // 修改类申报:表单以目标台账当前值打底,变更字段覆盖
    const led = d.targetLedgerId ? ledgerMap[d.targetLedgerId] : null;
    if (led) fillFromLedger(led, payload);
    viewOnly.value = !canEditStatus(String(d.status));
    showEdit.value = true;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  }
}

/** 用台账当前值填补 payload 中缺失的字段(不覆盖已有变更值) */
function fillFromLedger(led: any, target: Record<string, any> = payload) {
  const base: Record<string, any> = {
    deviceName: led.deviceName, stationName: led.stationName, deviceType: led.deviceType,
    ratedCapacity: led.ratedCapacity, kvnom: led.kvnom, pmax: led.pmax, pmin: led.pmin,
    deviceStatus: led.deviceStatus, runState: led.runState,
    dispatchRelation: led.dispatchRelation, commissionDate: led.commissionDate, remark: led.remark,
  };
  for (const k of Object.keys(base)) {
    const v = target[k];
    if (v === undefined || v === null || v === '') target[k] = base[k];
  }
}

/** 目标台账下拉(修改已有台账时选择) */
const ledgerOptions = ref<any[]>([]);
const ledgerMap = reactive<Record<string, any>>({});
async function loadLedgerOptions() {
  try {
    const res: any = await ledgerInfoList({ pageNum: 1, pageSize: 999 });
    const arr = res?.data?.list ?? [];
    ledgerOptions.value = arr.map((l: any) => ({ label: `${l.deviceName}(${l.areaName || '-'})`, value: l.id }));
    arr.forEach((l: any) => { ledgerMap[l.id] = l; });
  } catch { /* ignore */ }
}
const currentTarget = computed(() => (editForm.targetLedgerId ? ledgerMap[editForm.targetLedgerId] : null));

// ===== 模板特有字段动态区:目标台账所挂模板的 fieldDefinition 中非宽表列字段(值存 payload.extra) =====
const tplFieldMap = reactive<Record<string, any[]>>({});
async function loadTplFields() {
  try {
    const res: any = await ledgerTemplateList({ pageNum: 1, pageSize: 100, enabled: 'Y' });
    for (const t of res?.data?.list ?? []) {
      try { tplFieldMap[t.id] = JSON.parse(t.fieldDefinition || '[]'); } catch { tplFieldMap[t.id] = []; }
    }
  } catch { /* ignore */ }
}
const targetExtraFields = computed(() => {
  const tplId = currentTarget.value?.templateId;
  return (tplId ? tplFieldMap[tplId] ?? [] : []).filter((f: any) => f.name && !LEDGER_COLUMN_CN[f.name]);
});
const extraForm = reactive<Record<string, any>>({});
function rebuildExtraForm(from: Record<string, any> = {}) {
  Object.keys(extraForm).forEach((k) => delete extraForm[k]);
  for (const f of targetExtraFields.value) {
    extraForm[f.name] = from[f.name] ?? null;
  }
}
function syncExtraFromLedger(led: any) {
  let parsed: any = {};
  if (led?.extraData) {
    try { parsed = JSON.parse(led.extraData); } catch { parsed = {}; }
  }
  rebuildExtraForm(parsed);
}

/** 选目标台账后预填当前值,县调在其基础上改 */
function onTargetChange(id?: string) {
  Object.keys(payload).forEach((k) => delete payload[k]);
  const led = id ? ledgerMap[id] : null;
  if (led) fillFromLedger(led);
  // 切换目标台账:特有字段区按其模板重建,并回显台账已存 EXTRA_DATA 值
  syncExtraFromLedger(led);
}

async function onSave() {
  if (!editForm.areaName) { message.warning('请选择所属县区'); return; }
  if (!payload.deviceName) { message.warning('请填写台账名称'); return; }
  if (!payload.deviceType) { message.warning('请选择设备类型'); return; }
  if (payload.pmax != null && payload.pmin != null && Number(payload.pmax) < Number(payload.pmin)) {
    message.warning('出力上限 Pmax 不能小于出力下限 Pmin');
    return;
  }

  saving.value = true;
  try {
    // 特有字段(有值时)并入 payload.extra,地调确认后写入台账 EXTRA_DATA
    const extra: Record<string, any> = {};
    for (const f of targetExtraFields.value) {
      if (extraForm[f.name] !== null && extraForm[f.name] !== undefined && extraForm[f.name] !== '') {
        extra[f.name] = extraForm[f.name];
      }
    }
    await countyEditSaveDraft({
      id: editForm.id || undefined,
      targetLedgerId: editForm.targetLedgerId || undefined,
      areaName: editForm.areaName,
      editBy: editForm.editBy,
      payload: JSON.stringify({ ...payload, ...(Object.keys(extra).length ? { extra } : {}) }),
    });
    message.success('已上报,等待地调确认');
    showEdit.value = false;
    loadData();
  } catch (e: any) {
    message.error(e?.message || '上报失败');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadAreaOptions();
  loadLedgerOptions();
  loadTplFields();
  loadData();
});
</script>

<style scoped lang="less">
.tab-inner { background: #fff; border-radius: 4px; padding: 16px; }
.filter-form { margin-bottom: 12px; }
.toolbar-hint { color: #999; font-size: 12px; }
.pin-tag { margin-right: 4px; }
:deep(.ant-table-tbody) {
  font-variant-numeric: tabular-nums;
}
</style>
