import {
  templates as seedTemplates,
  ledgers as seedLedgers,
  drafts as seedDrafts,
  archives as seedArchives,
  batches as seedBatches,
  batchDetails as seedBatchDetails,
  syncLogs as seedSyncLogs,
} from './ledgerSeedAdapter';

/**
 * 台账模块前端 Mock 服务（设计迭代期专用，后端临时封存）
 *
 * 设计约定（也是后续后端同步改造的契约）：
 * 1. 与 api/resource.ts 同名同参同返回结构：resolve { code: 0, data, msg }（与 axios 拦截器出口一致）
 * 2. 上报批次不再有 模板/目标系统 字段；上报明细/失败记录冗余 deviceName/areaName
 * 3. 台账编辑为全字段静态表单，不再依赖模板 fieldDefinition 驱动
 * 4. compareWithProvincial → { provincialOnlyCount }；scanNewLedger → 地调有省调没有的台账列表
 * 5. 数据为内存态：刷新页面还原为种子数据（设计迭代够用，不持久化）
 *
 * 切回真实后端：只改 src/api/ledger.ts 中 USE_MOCK = false，页面零改动。
 */

// ============================== 种子数据 ==============================

const COUNTIES = ['溧阳市', '金坛区', '武进区', '新北区', '天宁区', '钟楼区'];

let ledgerSeq = 0;
function L(
  deviceName: string, stationName: string, deviceType: string, cap: number, area: string,
  opts: any = {}
): any {
  ledgerSeq += 1;
  return {
    id: 'LEDG' + String(ledgerSeq).padStart(3, '0'),
    emsId: 'EMS' + (10000 + ledgerSeq),
    deviceName, stationName, deviceType,
    ratedCapacity: cap,
    kvnom: opts.kvnom ?? 220,
    pmax: opts.pmax ?? cap,
    pmin: opts.pmin ?? 0,
    areaName: area,
    dispatchRelation: opts.dispatch ?? '地调调度',
    deviceStatus: '1',
    runState: opts.run ?? '并网运行',
    manufacturer: opts.mfr ?? '-',
    modelNo: opts.model ?? '-',
    commissionDate: opts.date ?? '2021-06-30',
    dataBaseline: opts.base ?? 'LOCAL',
    archiveStatus: opts.arch ?? 'ARCHIVED',
    syncTime: opts.sync ?? '2026-08-28 06:00:00',
    syncSource: opts.base === 'PROVINCIAL' ? 'D5000_EMS' : 'LOCAL',
    templateId: opts.tpl ?? (deviceType === 'THERMAL' || deviceType === 'GAS' || deviceType === 'PUMPED_STORAGE' ? 'TPL001'
      : deviceType === 'STORAGE' ? 'TPL003' : deviceType === 'OTHER' ? 'TPL004' : 'TPL002'),
    remark: opts.remark ?? '',
    updateDataDateTime: '2026-08-30 09:00:00',
    latestDraftId: null as string | null,
  };
}

// 32 条常州台账（1-14/20-32 与省调匹配；15-19 为地调独有→"地调待上报"金底行）
const ledgers: any[] = [...seedLedgers];

// 省调台账（31 条 = 与地调匹配 27 + 仅省调 4；仅省调数即常州台账 tab 角标）
let puSeq = 0;
function P(name: string, station: string, gn: string, area: string, pmax: number, pmin: number, mvarate: number, opts: any = {}): any {
  puSeq += 1;
  return {
    id: 'PU' + String(puSeq).padStart(3, '0'),
    name, stationName: station, gnType: gn, areaName: area,
    pmax, pmin, mvarate,
    runState: opts.run ?? '运行',
    sampleTime: '2026-08-31 05:00:00',
  };
}
const provincialUnits: any[] = [
  P('湖塘储能电站', '湖塘储能站', 'storage', '武进区', 50, -50, 55),
  P('常州绿色热电', '绿色热电厂', 'biomass', '金坛区', 30, 0, 33),
  P('华润常州#1机组', '常州电厂', 'thermal', '新北区', 1000, 500, 550),
  P('国电常州#2机组', '常州电厂', 'thermal', '新北区', 660, 330, 360),
  P('戚墅堰燃机#1', '戚墅堰电厂', 'gas', '武进区', 480, 240, 260),
  P('华电常州燃机#2', '常州燃机站', 'gas', '武进区', 400, 200, 220),
  P('溧阳抽蓄#1机组', '溧阳抽水蓄能电站', 'pumped_storage', '溧阳市', 250, -250, 275),
  P('溧阳抽蓄#2机组', '溧阳抽水蓄能电站', 'pumped_storage', '溧阳市', 250, -250, 275),
  P('溧阳抽蓄#3机组', '溧阳抽水蓄能电站', 'pumped_storage', '溧阳市', 250, -250, 275),
  P('天目湖光伏电站', '天目湖光伏升压站', 'solar', '溧阳市', 100, 0, 110),
  P('上黄河光伏电站', '上黄光伏升压站', 'solar', '溧阳市', 80, 0, 88),
  P('金坛光伏一期', '金坛光伏升压站', 'solar', '金坛区', 60, 0, 66),
  P('正信光伏电站', '正信工业园', 'solar', '金坛区', 30, 0, 33),
  P('长荡湖风电场', '长荡湖风电升压站', 'wind', '金坛区', 150, 0, 165),
  P('茅山风电场', '茅山风电升压站', 'wind', '金坛区', 80, 0, 88),
  P('金坛盐穴储能电站', '金坛盐穴储能站', 'storage', '金坛区', 300, -300, 330),
  P('郑陆光伏电站', '郑陆光伏升压站', 'solar', '天宁区', 25, 0, 27),
  P('邹区光伏电站', '邹区光伏升压站', 'solar', '钟楼区', 18, 0, 20),
  P('指前光伏电站', '指前光伏升压站', 'solar', '金坛区', 35, 0, 38),
  P('牛塘风电场', '牛塘风电升压站', 'wind', '武进区', 45, 0, 50),
  P('溧阳储能一站', '溧阳储能一站', 'storage', '溧阳市', 60, -60, 66),
  P('溧阳储能二站', '溧阳储能二站', 'storage', '溧阳市', 60, -60, 66),
  P('雕庄储能电站', '雕庄储能站', 'storage', '天宁区', 30, -30, 33),
  P('长江路开关站1号馈线', '长江路开关站', 'other', '新北区', 0, 0, 12),
  P('三井变2号馈线', '三井变', 'other', '新北区', 0, 0, 12),
  P('湖塘变3号馈线', '湖塘变', 'other', '武进区', 0, 0, 12),
  P('溧城变1号馈线', '溧城变', 'other', '溧阳市', 0, 0, 12),
  P('金城变2号馈线', '金城变', 'other', '金坛区', 0, 0, 12),
  P('清潭变1号馈线', '清潭变', 'other', '钟楼区', 0, 0, 12),
  // ---- 仅省调有（provincialOnly，角标=4）----
  P('长江石化自备电厂#1机组', '长江石化自备电厂', 'gas', '新北区', 90, 45, 50),
  P('天宁调峰燃机#1', '天宁调峰电站', 'gas', '天宁区', 100, 50, 55),
  P('金坛盐穴储气发电#2', '金坛盐穴储气站', 'gas', '金坛区', 60, 30, 33),
  P('沙河抽水蓄能#4', '沙河抽水蓄能电站', 'pumped_storage', '溧阳市', 50, -50, 55),
];

// 模板类型与设备类型共用 DeviceType 枚举(契约:后端 TemplateType 待同步为此枚举)
const templates: any[] = [...seedTemplates];

// 县调申报(简化模型,对齐原始需求:县调直接上报→地调确认/驳回,无草稿/撤销中间态)
// PENDING 的进常州台账前排:county-edit 3 条 / county-new 2 条
let draftSeq = 0;
function D(status: string, targetLedgerId: string | null, payload: any, area: string, editBy: string, editTime: string): any {
  draftSeq += 1;
  return {
    id: 'CD' + String(draftSeq).padStart(3, '0'),
    targetLedgerId,
    templateId: payload.deviceType === 'STORAGE' ? 'TPL003' : payload.deviceType === 'OTHER' ? 'TPL004' : payload.deviceType ? 'TPL002' : 'TPL001',
    areaName: area, editBy,
    payload: JSON.stringify(payload),
    status, editTime, updateDataDateTime: editTime,
  };
}
const drafts: any[] = [...seedDrafts];
// 关联申报单到台账(供批量归档候选判断)
drafts.forEach((dft) => {
  if (dft.targetLedgerId && dft.status === 'PENDING') {
    const led = ledgers.find((l) => l.id === dft.targetLedgerId);
    if (led) led.latestDraftId = dft.id;
  }
});

// 归档记录（APPROVED 8 / REJECTED 4）
let arcSeq = 0;
function A(ledgerId: string, draftId: string | null, archiveType: string, reviewStatus: string, reviewer: string, archiveBy: string, archiveTime: string, reviewTime: string, opinion: string): any {
  arcSeq += 1;
  const led = ledgers.find((l) => l.id === ledgerId);
  const snapshot = led ? JSON.stringify({ deviceName: led.deviceName, stationName: led.stationName, deviceType: led.deviceType, ratedCapacity: led.ratedCapacity, areaName: led.areaName, archiveStatus: led.archiveStatus }) : '{}';
  return {
    id: 'ARC' + String(arcSeq).padStart(3, '0'),
    ledgerId, ledgerName: led?.deviceName ?? ledgerId, draftId,
    archiveType, reviewStatus, reviewer, archiveBy,
    archiveTime, reviewTime, reviewOpinion: opinion,
    archiveData: snapshot,
  };
}
const archives: any[] = [...seedArchives];

// 上报批次 + 明细（批次无模板/目标字段；明细冗余 deviceName/areaName）
let batchSeq = 0;
function B(batchNo: string, status: string, triggerTime: string, finishTime?: string): any {
  batchSeq += 1;
  return {
    id: 'RPB' + String(batchSeq).padStart(3, '0'), batchNo, status,
    triggerTime, finishTime: finishTime ?? null,
    totalCount: 0, successCount: 0, failCount: 0,
  };
}
const batches: any[] = [...seedBatches];

let dtlSeq = 0;
function DT(batchId: string, ledgerId: string, status: string, reviewStatus: string | null, attempt: number, msg: string, reportTime: string | null, reviewTime?: string | null): any {
  dtlSeq += 1;
  const led = ledgers.find((l) => l.id === ledgerId);
  return {
    id: 'DTL' + String(dtlSeq).padStart(3, '0'), batchId, ledgerId,
    deviceName: led?.deviceName ?? ledgerId, areaName: led?.areaName ?? '-',
    status, reviewStatus, attemptCount: attempt,
    responseMsg: msg, reportTime, reviewTime: reviewTime ?? null,
    reportData: led ? JSON.stringify({ deviceName: led.deviceName, ratedCapacity: led.ratedCapacity, deviceType: led.deviceType }) : '{}',
  };
}
const batchDetails: any[] = [...seedBatchDetails];

function recalcBatch(batch: any) {
  const list = batchDetails.filter((d) => d.batchId === batch.id);
  batch.totalCount = list.length;
  batch.successCount = list.filter((d) => d.status === 'REPORTED').length;
  batch.failCount = list.filter((d) => d.status === 'FAILED').length;
  // 审核进度口径:仅已出具审核结果(通过/未通过)的明细计入,新增/审核中不进入
  batch.approvedCount = list.filter((d) => d.status === 'REPORTED' && d.reviewStatus === 'APPROVED').length;
  batch.rejectedCount = list.filter((d) => d.status === 'REPORTED' && d.reviewStatus === 'REJECTED').length;
  if (batch.status !== 'CANCELLED') {
    const allDone = list.every((d) => d.status !== 'PENDING' && d.status !== 'REPORTING');
    if (allDone && list.length) batch.status = list.some((d) => d.status === 'REPORTED') ? 'DONE' : 'FAILED';
  }
}
batches.forEach(recalcBatch);

// 省地同步日志（12 条）
let syncSeq = 0;
function S(syncBatch: string, status: string, total: number, succ: number, start: string, end: string, errorMsg?: string, remark?: string): any {
  syncSeq += 1;
  return { id: 'SL' + String(syncSeq).padStart(3, '0'), syncBatch, status, totalCount: total, successCount: succ, failCount: total - succ, startTime: start, endTime: end, errorMsg: errorMsg ?? '', remark: remark ?? '' };
}
const syncLogs: any[] = [...seedSyncLogs];

// ============================== 工具 ==============================

function ok(data: any = null) { return Promise.resolve({ code: 0, data, msg: 'success' }); }

function paginate(arr: any[], params: any) {
  const pageNum = Number(params?.pageNum ?? 1) || 1;
  const pageSize = Number(params?.pageSize ?? 10) || 10;
  return { list: arr.slice((pageNum - 1) * pageSize, pageNum * pageSize), total: arr.length };
}

function matches(str: any, kw?: string): boolean {
  if (!kw) return true;
  return String(str ?? '').toLowerCase().includes(String(kw).toLowerCase());
}

function nowStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ============================== 台账 ==============================

export function ledgerInfoList(params: any) {
  const q = params ?? {};
  let arr = ledgers.slice();
  if (q.dataBaseline) arr = arr.filter((l) => l.dataBaseline === q.dataBaseline);
  if (q.deviceType) arr = arr.filter((l) => l.deviceType === q.deviceType);
  if (q.deviceName) arr = arr.filter((l) => matches(l.deviceName, q.deviceName));
  if (q.stationName) arr = arr.filter((l) => matches(l.stationName, q.stationName));
  if (q.deviceStatus) arr = arr.filter((l) => String(l.deviceStatus) === String(q.deviceStatus));
  if (q.archiveStatus) arr = arr.filter((l) => l.archiveStatus === q.archiveStatus);
  return ok(paginate(arr, q));
}

export function ledgerInfoInfo(id: string) {
  return ok(ledgers.find((l) => l.id === id) ?? null);
}

export function ledgerInfoSave(form: any) {
  ledgerSeq += 1;
  const row = { ...form, id: 'LEDG' + String(ledgerSeq).padStart(3, '0'), updateDataDateTime: nowStr() };
  ledgers.unshift(row);
  return ok(row.id);
}

export function ledgerInfoUpdate(form: any) {
  const row = ledgers.find((l) => l.id === form.id);
  if (row) { Object.assign(row, form, { updateDataDateTime: nowStr() }); }
  return ok(row?.id ?? null);
}

export function ledgerInfoDelete(ids: string[]) {
  for (const id of ids ?? []) {
    const idx = ledgers.findIndex((l) => l.id === id);
    if (idx >= 0) ledgers.splice(idx, 1);
  }
  return ok(true);
}

export function ledgerTemplateList(params?: any) {
  const enabled = params?.enabled;
  let arr = enabled ? templates.filter((t) => t.enabled === enabled) : templates.slice();
  if (params?.templateName) arr = arr.filter((t) => matches(t.templateName, params.templateName));
  return ok({ list: arr, total: arr.length });
}

let tplSeq = 0;

export function ledgerTemplateInfo(id: string) {
  return ok(templates.find((t) => t.id === id) ?? null);
}

export function ledgerTemplateSave(data: any) {
  tplSeq += 1;
  const row = { ...data, id: 'TPL' + String(100 + tplSeq), createDataDateTime: nowStr() };
  templates.push(row);
  return ok(row.id);
}

export function ledgerTemplateUpdate(data: any) {
  const row = templates.find((t) => t.id === data?.id);
  if (row) Object.assign(row, data);
  return ok(row?.id ?? null);
}

export function ledgerTemplateDelete(ids: string[]) {
  for (const id of ids ?? []) {
    const idx = templates.findIndex((t) => t.id === id);
    if (idx >= 0) templates.splice(idx, 1);
  }
  return ok(true);
}

function tplFields(tpl: any): any[] {
  try { return tpl?.fieldDefinition ? JSON.parse(tpl.fieldDefinition) : []; } catch { return []; }
}

/** 合理性检查(新语义):检查该模板关联的全部台账数据是否满足模板必填字段 */
export function ledgerTemplateCheckIntegrity(id: string) {
  const tpl = templates.find((t) => t.id === id);
  if (!tpl) return Promise.reject(new Error('模板不存在'));
  const required = tplFields(tpl).filter((f: any) => f.required);
  const linked = ledgers.filter((l) => l.templateId === id);
  if (!linked.length) {
    return ok({ ok: true, issues: [], checkedCount: 0, message: '该模板暂无关联台账' });
  }
  const issues: any[] = [];
  for (const led of linked) {
    for (const f of required) {
      const v = (led as any)[f.name];
      if (v === undefined || v === null || v === '') {
        issues.push({
          level: 'MISSING', fieldName: f.name, ledgerName: led.deviceName,
          message: `${led.deviceName}: 必填字段「${f.desc || f.name}」未填写`,
        });
      }
    }
  }
  return ok({ ok: issues.length === 0, issues, checkedCount: linked.length });
}

// ===== 模板字段映射(mock) =====
let mapSeq = 0;
const mappings: any[] = [
  { id: 'MAP001', mappingName: '火电模板-名称映射', templateId: 'TPL001', sourceField: 'deviceName', targetField: 'deviceName', enabled: 'Y', remark: '', updateDataDateTime: '2026-08-20 10:00:00' },
  { id: 'MAP002', mappingName: '火电模板-容量映射', templateId: 'TPL001', sourceField: 'ratedCapacity', targetField: 'ratedCapacity', enabled: 'Y', remark: '', updateDataDateTime: '2026-08-20 10:00:00' },
];

export function ledgerMappingList(params?: any) {
  const q = params ?? {};
  let arr = mappings.slice();
  if (q.templateId) arr = arr.filter((m) => m.templateId === q.templateId);
  if (q.mappingName) arr = arr.filter((m) => matches(m.mappingName, q.mappingName));
  if (q.enabled) arr = arr.filter((m) => m.enabled === q.enabled);
  return ok(paginate(arr, q));
}

export function ledgerMappingInfo(id: string) {
  return ok(mappings.find((m) => m.id === id) ?? null);
}

export function ledgerMappingSave(data: any) {
  mapSeq += 1;
  const row = { ...data, id: 'MAP' + String(100 + mapSeq), updateDataDateTime: nowStr() };
  mappings.push(row);
  return ok(row.id);
}

export function ledgerMappingUpdate(data: any) {
  const row = mappings.find((m) => m.id === data?.id);
  if (row) Object.assign(row, data, { updateDataDateTime: nowStr() });
  return ok(row?.id ?? null);
}

export function ledgerMappingDelete(ids: string[]) {
  for (const id of ids ?? []) {
    const idx = mappings.findIndex((m) => m.id === id);
    if (idx >= 0) mappings.splice(idx, 1);
  }
  return ok(true);
}

/** 未映射字段数 = 模板字段中未被启用映射覆盖的 sourceField 个数 */
export function ledgerMappingCountUnmapped(templateId: string) {
  const tpl = templates.find((t) => t.id === templateId);
  const mapped = new Set(mappings.filter((m) => m.templateId === templateId && m.enabled === 'Y').map((m) => m.sourceField));
  const unmapped = tplFields(tpl).filter((f: any) => !mapped.has(f.name)).length;
  return ok(unmapped);
}

/** CR-008 角标:省调有地调没有 */
export function compareWithProvincial(_params?: any) {
  const localNames = new Set(ledgers.map((l) => l.deviceName));
  const provOnly = provincialUnits.filter((p) => !localNames.has(p.name));
  const provNames = new Set(provincialUnits.map((p) => p.name));
  const localOnly = ledgers.filter((l) => !provNames.has(l.deviceName));
  return ok({
    provincialOnlyCount: provOnly.length,
    localOnlyCount: localOnly.length,
    matchCount: ledgers.length - localOnly.length,
    total: ledgers.length,
  });
}

/** 地调待上报清单:地调有省调没有的真实台账行(金底可勾选可上报) */
export function scanNewLedger() {
  const provNames = new Set(provincialUnits.map((p) => p.name));
  const arr = ledgers.filter((l) => !provNames.has(l.deviceName));
  return ok({ list: arr, total: arr.length });
}

// ============================== 省调台账/同步 ==============================

export function provincialUnitList(params?: any) {
  const q = params ?? {};
  let arr = provincialUnits.slice();
  if (q.name) arr = arr.filter((p) => matches(p.name, q.name));
  if (q.stationName) arr = arr.filter((p) => matches(p.stationName, q.stationName));
  if (q.gnType) arr = arr.filter((p) => p.gnType === q.gnType);
  if (q.areaName) arr = arr.filter((p) => p.areaName === q.areaName);
  return ok(paginate(arr, q));
}

export function provincialSyncList(params?: any) {
  return ok(paginate(syncLogs.slice().reverse(), params));
}

/** 同步逐条明细:按 syncBatch 或 startTime~endTime 时间窗匹配 */
export function provincialSyncDetailList(params: { syncBatch?: string; startTime?: string; endTime?: string }) {
  let log: any = null;
  if (params?.syncBatch) log = syncLogs.find((s) => s.syncBatch === params.syncBatch);
  else if (params?.startTime) log = syncLogs.find((s) => s.startTime === params.startTime);
  if (!log || log.status === 'FAILED') return ok([]);
  const sampleTime = log.endTime;
  const rows = provincialUnits
    .filter((_, i) => log!.status === 'SUCCESS' || i % 10 !== 0) // PARTIAL 模拟跳过部分
    .slice(0, log.successCount)
    .map((p) => ({ ...p, sampleTime }));
  return ok(rows);
}

/** 同步按钮(常州台账 tab):省调 → 地调,把仅省调有的机组同步落地,新落库行打蓝底 */
export function provincialSyncTrigger(_data?: any) {
  const localNames = new Set(ledgers.map((l) => l.deviceName));
  const newOnes = provincialUnits.filter((p) => !localNames.has(p.name));
  const ts = nowStr();
  let added = 0;
  for (const p of newOnes) {
    ledgers.unshift(L(p.name, p.stationName, gnToType(p.gnType), p.pmax, p.areaName, {
      base: 'PROVINCIAL', sync: new Date().toISOString(), run: '并网运行', arch: 'UNARCHIVED',
    }));
    added += 1;
    if (added >= 2) break; // 每次同步落地 2 条,便于反复演示蓝底效果
  }
  // 已有省调基准的台账刷新 syncTime(蓝底标识)
  for (const l of ledgers) {
    if (l.dataBaseline === 'PROVINCIAL' && !newOnes.some((p) => p.name === l.deviceName)) {
      l.syncTime = new Date().toISOString();
    }
  }
  // 同步日志按省调侧真实机组数记账(模拟个别失败)
  const total = provincialUnits.length;
  const failCount = Math.min(2, total);
  const successCount = total - failCount;
  syncLogs.push(S(
    'SYNC' + ts.replace(/[-: ]/g, '').slice(0, 14) + '01',
    failCount > 0 ? 'PARTIAL' : 'SUCCESS',
    total, successCount, ts, ts, failCount > 0 ? `${failCount} 条机组数据采样越限,已跳过` : '', '人工触发',
  ));
  return ok({ status: failCount > 0 ? 'PARTIAL' : 'SUCCESS', totalCount: total, successCount, failCount, newCount: added });
}

function gnToType(gn: string): string {
  const map: Record<string, string> = { thermal: 'THERMAL', hydro: 'HYDRO', pumped_storage: 'PUMPED_STORAGE', gas: 'GAS', wind: 'WIND', solar: 'SOLAR', storage: 'STORAGE', other: 'OTHER' };
  return map[gn] ?? 'OTHER';
}

// ============================== 县调草稿(县调管理页) ==============================

export function countyEditList(params?: any) {
  const q = params ?? {};
  let arr = drafts.slice().reverse();
  if (q.status) arr = arr.filter((d) => d.status === q.status);
  if (q.areaName) arr = arr.filter((d) => d.areaName === q.areaName);
  if (q.editBy) arr = arr.filter((d) => matches(d.editBy, q.editBy));
  if (q.templateId) arr = arr.filter((d) => d.templateId === q.templateId);
  // 冗余设备名(payload 优先,修改类草稿回查目标台账),便于列表直读
  arr = arr.map((d) => ({
    ...d,
    deviceName: parseJson(d.payload).deviceName ?? ledgers.find((l) => l.id === d.targetLedgerId)?.deviceName ?? '(未命名)',
  }));
  return ok(paginate(arr, q));
}

function parseJson(s: string | null): any {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

export function countyEditInfo(id: string) {
  return ok(drafts.find((d) => d.id === id) ?? null);
}

/** 县调直接上报:传 id 则更新原申报单(驳回后可改再报);新建时若同台账已有待确认申报则覆盖原申报(互斥) */
export function countyEditSaveDraft(data: any) {
  const ts = nowStr();
  if (data?.id) {
    const d = drafts.find((x) => x.id === data.id);
    if (!d) return Promise.reject(new Error('申报单不存在'));
    d.areaName = data.areaName; d.editBy = data.editBy;
    d.payload = data.payload; d.status = 'PENDING';
    d.editTime = ts; d.updateDataDateTime = ts;
    if (d.targetLedgerId) {
      const led = ledgers.find((l) => l.id === d.targetLedgerId);
      if (led) led.latestDraftId = d.id;
    }
    return ok(d.id);
  }
  // 互斥:同台账已有待确认申报 → 覆盖原申报
  const dup = data?.targetLedgerId ? drafts.find((x) => x.targetLedgerId === data.targetLedgerId && x.status === 'PENDING') : null;
  if (dup) {
    dup.areaName = data.areaName; dup.editBy = data.editBy;
    dup.payload = data.payload; dup.editTime = ts; dup.updateDataDateTime = ts;
    return ok(dup.id);
  }
  draftSeq += 1;
  const row = {
    id: 'CD' + String(draftSeq).padStart(3, '0'),
    targetLedgerId: data.targetLedgerId ?? null,
    templateId: data.templateId ?? 'TPL002',
    areaName: data.areaName, editBy: data.editBy,
    payload: data.payload, status: 'PENDING',
    editTime: ts, updateDataDateTime: ts,
  };
  drafts.push(row);
  if (row.targetLedgerId) {
    const led = ledgers.find((l) => l.id === row.targetLedgerId);
    if (led) led.latestDraftId = row.id;
  }
  return ok(row.id);
}

// ============================== 归档 ==============================

export function ledgerArchiveList(params?: any) {
  const q = params ?? {};
  let arr = archives.slice().reverse();
  if (q.reviewStatus) arr = arr.filter((a) => a.reviewStatus === q.reviewStatus);
  return ok(paginate(arr, q));
}

export function ledgerArchiveInfo(id: string) {
  return ok(archives.find((a) => a.id === id) ?? null);
}

/** 审批通过草稿:合并 payload 入台账 + 生成归档留痕 */
export function ledgerArchiveApprove(data: any) {
  const d = drafts.find((x) => x.id === data?.draftId);
  if (!d) return Promise.reject(new Error('草稿不存在'));
  d.status = 'APPROVED';
  d.updateDataDateTime = nowStr();
  const payload = parseJson(d.payload);
  const opinion = (data?.opinion ?? '').trim();
  if (d.targetLedgerId) {
    const led = ledgers.find((l) => l.id === d.targetLedgerId);
    if (led) {
      Object.assign(led, payload, { updateDataDateTime: nowStr(), archiveStatus: 'ARCHIVED', latestDraftId: null });
      archives.push(A(led.id, d.id, 'UPDATE', 'APPROVED', data.reviewer ?? 'admin', d.editBy, nowStr(), nowStr(), opinion));
    }
  } else {
    ledgerSeq += 1;
    const row = {
      id: 'LEDG' + String(ledgerSeq).padStart(3, '0'), emsId: '',
      deviceName: payload.deviceName ?? '(未命名)', stationName: payload.stationName ?? '',
      deviceType: payload.deviceType ?? 'OTHER', ratedCapacity: payload.ratedCapacity ?? 0,
      kvnom: payload.kvnom ?? 110, pmax: payload.ratedCapacity ?? 0, pmin: 0,
      areaName: payload.areaName ?? d.areaName, dispatchRelation: payload.dispatchRelation ?? '县调调度',
      deviceStatus: '1', runState: payload.runState ?? '并网运行',
      manufacturer: payload.manufacturer ?? '-', modelNo: payload.modelNo ?? '-',
      commissionDate: payload.commissionDate ?? '', dataBaseline: payload.dataBaseline ?? 'COUNTY',
      archiveStatus: 'ARCHIVED', syncTime: null, syncSource: 'LOCAL',
      templateId: d.templateId, remark: payload.remark ?? '',
      updateDataDateTime: nowStr(), latestDraftId: null,
    };
    ledgers.unshift(row);
    archives.push(A(row.id, d.id, 'NEW', 'APPROVED', data.reviewer ?? 'admin', d.editBy, nowStr(), nowStr(), opinion));
  }
  return ok({ draftId: d.id });
}

export function ledgerArchiveReject(data: any) {
  const d = drafts.find((x) => x.id === data?.draftId);
  if (!d) return Promise.reject(new Error('草稿不存在'));
  d.status = 'REJECTED';
  d.updateDataDateTime = nowStr();
  const targetId = d.targetLedgerId ?? '';
  const led = ledgers.find((l) => l.id === targetId);
  const opinion = (data?.opinion ?? '').trim();
  archives.push(A(targetId || '-', d.id, d.targetLedgerId ? 'UPDATE' : 'NEW', 'REJECTED', data.reviewer ?? 'admin', d.editBy, nowStr(), nowStr(), opinion));
  if (led) led.latestDraftId = null;
  return ok({ draftId: d.id });
}

export function ledgerArchiveBatchApprove(data: { draftIds: string[]; reviewer?: string; opinion?: string }) {
  let success = 0; let fail = 0;
  for (const id of data?.draftIds ?? []) {
    try { ledgerArchiveApprove({ draftId: id, reviewer: data.reviewer, opinion: data.opinion }); success += 1; } catch { fail += 1; }
  }
  return ok({ successCount: success, failCount: fail });
}

// ============================== 上报批次 ==============================

export function ledgerBatchList(params?: any) {
  return ok(paginate(batches.slice().reverse(), params));
}

export function ledgerBatchCreate(data: any) {
  batchSeq += 1;
  const ids: string[] = data?.ledgerIds?.length ? data.ledgerIds : ledgers.filter((l) => l.archiveStatus === 'ARCHIVED').map((l) => l.id);
  const batchNo = 'RP' + nowStr().replace(/[-: ]/g, '').slice(0, 14) + '01';
  const batch = { id: 'RPB' + String(batchSeq).padStart(3, '0'), batchNo, status: 'READY', triggerTime: nowStr(), finishTime: null, totalCount: ids.length, successCount: 0, failCount: 0 };
  batches.push(batch);
  for (const lid of ids) {
    const led = ledgers.find((l) => l.id === lid);
    dtlSeq += 1;
    batchDetails.push({
      id: 'DTL' + String(dtlSeq).padStart(3, '0'), batchId: batch.id, ledgerId: lid,
      deviceName: led?.deviceName ?? lid, areaName: led?.areaName ?? '-',
      status: 'PENDING', reviewStatus: null, attemptCount: 0,
      responseMsg: '待执行', reportTime: null, reviewTime: null,
      reportData: led ? JSON.stringify({ deviceName: led.deviceName, ratedCapacity: led.ratedCapacity }) : '{}',
    });
  }
  return ok({ batchId: batch.id, batchNo: batch.batchNo });
}

export function ledgerBatchExecute(data: { batchId: string }) {
  const batch = batches.find((b) => b.id === data?.batchId);
  if (!batch) return Promise.reject(new Error('批次不存在'));
  let success = 0; let fail = 0;
  // 模拟省调侧处理+审核回流:上报成功明细中多数直接出具审核结果(通过/未通过),少数留专业审核中
  batchDetails.filter((d) => d.batchId === batch.id && (d.status === 'PENDING' || d.status === 'REPORTING')).forEach((d, i) => {
    if (i % 7 === 6) {
      // ~14% 传输失败(通道/超时/校验类异常,原因写入 responseMsg)
      d.status = 'FAILED'; d.attemptCount += 1;
      d.responseMsg = ['上报超时(30s 无响应)', '省调侧接口连接失败(Connection refused)', '省调侧返回数据格式校验失败'][i % 3];
    } else {
      d.status = 'REPORTED'; d.attemptCount += 1;
      d.responseMsg = '上报成功'; d.reportTime = nowStr();
      if (i % 7 === 5) { d.reviewStatus = 'REJECTED'; d.reviewTime = nowStr(); d.responseMsg = '上报成功,省调专业审核未通过(数据与省调侧存量不一致)'; }
      else if (i % 7 === 3) { d.reviewStatus = 'IN_REVIEW'; }
      else { d.reviewStatus = 'APPROVED'; d.reviewTime = nowStr(); }
      success++;
    }
  });
  recalcBatch(batch);
  return ok({ successCount: success, failCount: batch.failCount, status: batch.status });
}

export function ledgerBatchCancel(data: { batchId: string }) {
  const batch = batches.find((b) => b.id === data?.batchId);
  if (batch) {
    batch.status = 'CANCELLED';
    batchDetails.filter((d) => d.batchId === batch.id && d.status === 'PENDING').forEach((d) => { d.status = 'CANCELLED'; });
    recalcBatch(batch);
  }
  return ok(true);
}

export function ledgerBatchDetail(batchId: string) {
  const batch = batches.find((b) => b.id === batchId);
  return ok({ batch, list: batchDetails.filter((d) => d.batchId === batchId) });
}

export function ledgerBatchRetryFailed(data: { batchId: string }) {
  let retrySuccess = 0; let retryFail = 0;
  batchDetails.filter((d) => d.batchId === data?.batchId && d.status === 'FAILED').forEach((d) => {
    if (d.attemptCount < 3) { d.status = 'REPORTED'; d.attemptCount += 1; d.responseMsg = '重试上报成功'; d.reportTime = nowStr(); d.reviewStatus = 'IN_REVIEW'; retrySuccess += 1; }
    else { retryFail += 1; }
  });
  const batch = batches.find((b) => b.id === data?.batchId);
  if (batch) recalcBatch(batch);
  return ok({ retrySuccess, retryFail });
}

export function ledgerBatchRetryDetail(data: { detailId: string }) {
  const d = batchDetails.find((x) => x.id === data?.detailId);
  if (!d) return ok({ success: false, message: '明细不存在' });
  if (d.status === 'FAILED' || d.reviewStatus === 'REJECTED') {
    d.status = 'REPORTED'; d.reviewStatus = 'IN_REVIEW'; d.attemptCount += 1;
    d.responseMsg = '重新上报成功'; d.reportTime = nowStr();
    const batch = batches.find((b) => b.id === d.batchId);
    if (batch) recalcBatch(batch);
    return ok({ success: true, message: '重新上报成功,进入专业审核' });
  }
  return ok({ success: false, message: '当前状态不允许重新上报' });
}

/** 批量重新上报(失败记录 tab):仅传输失败/审核未通过的明细可重报 */
export function ledgerBatchRetryDetailBatch(data: { detailIds: string[] }) {
  let successCount = 0; let failCount = 0; let skipped = 0;
  for (const id of data?.detailIds ?? []) {
    const d = batchDetails.find((x) => x.id === id);
    if (!d) { skipped += 1; continue; }
    if (d.status === 'FAILED' || d.reviewStatus === 'REJECTED') {
      d.status = 'REPORTED'; d.reviewStatus = 'IN_REVIEW'; d.attemptCount += 1;
      d.responseMsg = '批量重新上报成功'; d.reportTime = nowStr();
      successCount += 1;
      const batch = batches.find((b) => b.id === d.batchId);
      if (batch) recalcBatch(batch);
    } else {
      failCount += 1;
    }
  }
  return ok({ successCount, failCount, skipped });
}

export function ledgerBatchCancelDetail(data: { detailId: string }) {
  const d = batchDetails.find((x) => x.id === data?.detailId);
  if (!d) return Promise.reject(new Error('明细不存在'));
  if (d.status === 'PENDING' || d.reviewStatus === 'IN_REVIEW' || !d.reviewStatus) {
    d.status = 'CANCELLED'; d.responseMsg = '人工撤销上报';
    const batch = batches.find((b) => b.id === d.batchId);
    if (batch) recalcBatch(batch);
  }
  return ok(true);
}

export function ledgerBatchMockReview(data: { detailId?: string; result?: 'PASS' | 'FAIL' }) {
  let d = data?.detailId ? batchDetails.find((x) => x.id === data.detailId) : null;
  if (!d) d = batchDetails.find((x) => x.status === 'REPORTED' && x.reviewStatus === 'IN_REVIEW') ?? null;
  if (!d) return Promise.reject(new Error('没有专业审核中的明细'));
  d.reviewStatus = data?.result === 'FAIL' ? 'REJECTED' : 'APPROVED';
  d.reviewTime = nowStr();
  d.responseMsg = d.reviewStatus === 'REJECTED' ? '省调专业审核未通过(模拟)' : '省调专业审核通过(模拟)';
  return ok({ detailId: d.id, reviewStatus: d.reviewStatus, reviewStatusLabel: d.reviewStatus === 'REJECTED' ? '未通过' : '已通过' });
}

export function ledgerBatchFailedRecords(params?: any) {
  const arr = batchDetails.filter((d) => d.status === 'FAILED').map((d) => ({
    ...d, batchNo: batches.find((b) => b.id === d.batchId)?.batchNo ?? '',
  }));
  return ok(paginate(arr, params));
}

/** 批次审核状态同步(模拟省调侧回流):随机推动 1-2 条可前进明细
 * 推进规则:新增→专业审核中;专业审核中→已通过/未通过(随机) */
export function ledgerBatchSyncReview(data: { batchId: string }) {
  const batch = batches.find((b) => b.id === data?.batchId);
  if (!batch) return Promise.reject(new Error('批次不存在'));
  const list = batchDetails.filter((d) => d.batchId === batch.id);
  const cands: { d: any; to: string }[] = [];
  for (const d of list) {
    const s = String(d.status);
    if (s === 'PENDING' || s === 'REPORTING') cands.push({ d, to: 'IN_REVIEW' });
    else if (s === 'REPORTED' && d.reviewStatus === 'IN_REVIEW') {
      cands.push({ d, to: Math.random() > 0.35 ? 'APPROVED' : 'REJECTED' });
    }
  }
  if (!cands.length) {
    return ok({ changed: 0, changes: [], message: '该批次内没有可推进状态的明细(均已出具审核结果或失败/取消)' });
  }
  const n = Math.min(cands.length, 1 + Math.floor(Math.random() * 2)); // 随机 1-2 条
  const changes: any[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * cands.length);
    const c = cands.splice(idx, 1)[0];
    const from = c.d.status === 'REPORTED' ? '专业审核中' : '新增';
    if (c.to === 'IN_REVIEW') {
      c.d.status = 'REPORTED'; c.d.reviewStatus = 'IN_REVIEW'; c.d.attemptCount += 1;
      c.d.responseMsg = '上报成功'; c.d.reportTime = nowStr();
      changes.push({ deviceName: c.d.deviceName, from, to: '专业审核中' });
    } else {
      c.d.reviewStatus = c.to; c.d.reviewTime = nowStr();
      c.d.responseMsg = c.to === 'REJECTED' ? '省调专业审核未通过(状态同步回流)' : '省调专业审核通过(状态同步回流)';
      changes.push({ deviceName: c.d.deviceName, from, to: c.to === 'REJECTED' ? '未通过' : '已通过' });
    }
  }
  recalcBatch(batch);
  return ok({ changed: changes.length, changes });
}

export function ledgerBatchRecordStats() {
  const total = batchDetails.length;
  const reported = batchDetails.filter((d) => d.status === 'REPORTED').length;
  return ok({
    total, reported,
    failed: batchDetails.filter((d) => d.status === 'FAILED').length,
    pending: batchDetails.filter((d) => d.status === 'PENDING').length,
    cancelled: batchDetails.filter((d) => d.status === 'CANCELLED').length,
    reviewPending: batchDetails.filter((d) => d.status === 'REPORTED' && d.reviewStatus === 'IN_REVIEW').length,
    reviewApproved: batchDetails.filter((d) => d.status === 'REPORTED' && d.reviewStatus === 'APPROVED').length,
    reviewRejected: batchDetails.filter((d) => d.status === 'REPORTED' && d.reviewStatus === 'REJECTED').length,
  });
}

/** 上报批次统计(批次口径,与后端 /ledgerBatch/stats 同形) */
export function ledgerBatchStats() {
  return ok({
    total: batches.length,
    done: batches.filter((b) => b.status === 'DONE').length,
    running: batches.filter((b) => b.status === 'RUNNING').length,
    failed: batches.filter((b) => b.status === 'FAILED').length,
  });
}

/** 同步日志统计(次数口径,与后端 /provincialSync/stats 同形) */
export function provincialSyncStats() {
  return ok({
    total: syncLogs.length,
    success: syncLogs.filter((l) => l.status === 'SUCCESS').length,
    partial: syncLogs.filter((l) => l.status === 'PARTIAL').length,
    failed: syncLogs.filter((l) => l.status === 'FAILED').length,
    units: syncLogs.reduce((s, l) => s + (Number(l.successCount) || 0), 0),
  });
}

/** 归档审核统计(全局口径,与后端 /ledgerArchive/stats 同形) */
export function ledgerArchiveStats() {
  return ok({
    total: archives.length,
    approved: archives.filter((a) => a.reviewStatus === 'APPROVED').length,
    rejected: archives.filter((a) => a.reviewStatus === 'REJECTED').length,
  });
}

/** mock 导出:生成 CSV Blob(前端直接下载) */
export function ledgerBatchExport(batchId: string) {
  const batch = batches.find((b) => b.id === batchId);
  const rows = batchDetails.filter((d) => d.batchId === batchId);
  const header = '台账名称,所属县区,上报状态,专业审核,尝试次数,原因,上报时间\n';
  const body = rows.map((d) => [d.deviceName, d.areaName, d.status, d.reviewStatus ?? '-', d.attemptCount, `"${d.responseMsg}"`, d.reportTime ?? '-'].join(',')).join('\n');
  const csv = '\ufeff' + header + body;
  return Promise.resolve(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

// ============================== 时间轴 / 统计 ==============================

export function ledgerTimeline(ledgerId: string) {
  const countyEdits = drafts
    .filter((d) => d.targetLedgerId === ledgerId || (!d.targetLedgerId && parseJson(d.payload).deviceName === ledgers.find((l) => l.id === ledgerId)?.deviceName))
    .map((d) => ({ ...d }));
  const arcs = archives.filter((a) => a.ledgerId === ledgerId).map((a) => ({ ...a }));
  const reports = batchDetails
    .filter((d) => d.ledgerId === ledgerId)
    .map((d) => ({ ...d, batchNo: batches.find((b) => b.id === d.batchId)?.batchNo ?? '' }));
  const led = ledgers.find((l) => l.id === ledgerId);
  return ok({
    countyEdits, archives: arcs, reports,
    sync: led?.syncTime ? { syncTime: led.syncTime, syncSource: led.syncSource } : null,
  });
}

/** 县区资源统计矩阵(从台账内存数据实时聚合) */
export function countyStats() {
  const deviceTypes = Array.from(new Set(ledgers.map((l) => l.deviceType)));
  const areaNames = COUNTIES.slice();
  const matrix: Record<string, any> = {};
  let gCount = 0; let gCap = 0;
  for (const area of areaNames) {
    matrix[area] = {};
    for (const dt of deviceTypes) {
      const rows = ledgers.filter((l) => l.areaName === area && l.deviceType === dt);
      const cap = rows.reduce((s, l) => s + (Number(l.ratedCapacity) || 0), 0);
      matrix[area][dt] = { count: rows.length, capacity: cap };
    }
    const areaRows = ledgers.filter((l) => l.areaName === area);
    matrix[area]._total = { count: areaRows.length, capacity: areaRows.reduce((s, l) => s + (Number(l.ratedCapacity) || 0), 0) };
    gCount += areaRows.length;
    gCap += matrix[area]._total.capacity;
  }
  let topArea = '';
  let topCap = -1;
  for (const area of areaNames) {
    if (matrix[area]._total.capacity > topCap) { topCap = matrix[area]._total.capacity; topArea = area; }
  }
  const labels: Record<string, string> = { THERMAL: '火电', HYDRO: '水电', PUMPED_STORAGE: '抽蓄', GAS: '燃气', WIND: '风电', SOLAR: '光伏', STORAGE: '储能', BIOMASS: '生物质', OTHER: '其他' };
  return ok({
    areaNames, deviceTypes, deviceTypeLabels: labels, matrix,
    grandTotal: { count: gCount, capacity: Math.round(gCap * 100) / 100 },
    topArea: topArea ? `${topArea}(${Math.round(topCap)}MW)` : '',
  });
}

// 省调侧同步机组池(每次手动同步落地 2 台,池空后提示无新增)
let provSyncCount = 0;
const provSyncPool: any[] = [
  { name: '溧阳抽蓄#4机组', stationName: '溧阳抽水蓄能电站', gnType: 'pumped_storage', areaName: '溧阳市', pmax: 250, pmin: -250, mvarate: 275 },
  { name: '金坛光伏二期', stationName: '金坛光伏升压站', gnType: 'solar', areaName: '金坛区', pmax: 40, pmin: 0, mvarate: 44 },
  { name: '直溪光伏电站', stationName: '直溪光伏升压站', gnType: 'solar', areaName: '金坛区', pmax: 30, pmin: 0, mvarate: 33 },
  { name: '儒林储能电站', stationName: '儒林储能站', gnType: 'storage', areaName: '金坛区', pmax: 100, pmin: -100, mvarate: 110 },
];

/** 省调台账 tab 的同步:刷新省调机组快照,池中机组落地并打新采样时间 */
export function provincialUnitSyncTrigger() {
  const ts = nowStr();
  const added = provSyncPool.splice(0, 2).map((p) => {
    provSyncCount += 1;
    return {
      id: 'PU' + String(provSyncCount + 100).padStart(3, '0'),
      ...p,
      runState: '运行',
      sampleTime: new Date().toISOString(),
    };
  });
  provincialUnits.unshift(...added);
  syncLogs.push(S('SYNC' + ts.replace(/[-: ]/g, '').slice(0, 14) + '02', 'SUCCESS', provincialUnits.length, provincialUnits.length, ts, ts, '', '省调侧手动同步'));
  return ok({ newCount: added.length, addedNames: added.map((a) => a.name) });
}

/** 县区下拉(mock:固定 6 县区) */
export function areaInfoList(_params?: any) {
  return ok(COUNTIES.map((a) => ({ areaName: a })));
}

/** 省地对比汇总(mock:静态汇总,与 compareWithProvincial 同口径) */
export function compareSummary(_params?: any) {
  return ok({
    dm6Available: true,
    totalProvincial: 50,
    totalLocal: 47,
    matched: 42,
    different: 6,
    localOnly: 5,
    provincialOnly: 8,
  });
}
