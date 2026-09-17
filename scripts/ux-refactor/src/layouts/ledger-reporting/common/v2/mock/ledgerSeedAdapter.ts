/**
 * 前端 mock 种子适配器:从单一数据源(@seed/ledger-seed.json,与后端初始化种子共用同一份)
 * 派生出 mock 运行时结构。USE_MOCK=false 时本文件不被执行。
 */
import seed from './ledger-seed.json';

const pad3 = (n: number) => String(n).padStart(3, '0');

// ===== 模板 =====
export const templates: any[] = seed.templates.map((t: any, i: number) => ({
  id: 'TPL' + pad3(i + 1),
  templateName: t.name,
  fieldDefinition: JSON.stringify(t.fieldDefinition),
  enabled: t.enabled,
  version: 'v1',
}));
const tplIdByName: Record<string, string> = {};
templates.forEach((t) => { tplIdByName[t.templateName] = t.id; });

// ===== 台账 =====
const ledgerIdByEmsId: Record<string, string> = {};
const ledgerById: Record<string, any> = {};
export const ledgers: any[] = seed.ledgers.map((l: any) => ({
  id: l.code,
  templateId: tplIdByName[l.templateName] ?? null,
  emsId: l.emsId,
  deviceName: l.deviceName,
  stationName: l.stationName,
  deviceType: l.deviceType,
  ratedCapacity: l.ratedCapacity,
  kvnom: l.kvnom,
  pmax: l.pmax,
  pmin: l.pmin,
  areaName: l.areaName,
  dispatchRelation: l.dispatchRelation ?? '地调调度',
  deviceStatus: l.deviceStatus ?? '1',
  runState: l.runState ?? '并网运行',
  manufacturer: l.manufacturer ?? '-',
  modelNo: l.modelNo ?? '-',
  commissionDate: l.commissionDate ?? '',
  dataBaseline: l.dataBaseline,
  archiveStatus: l.archiveStatus,
  syncTime: l.sync === 'Y' ? '2026-08-28 06:00:00' : null,
  syncSource: l.sync === 'Y' ? 'D5000_EMS' : 'LOCAL',
  extraData: l.extra ? JSON.stringify(l.extra) : null,
  remark: l.remark ?? '',
  updateDataDateTime: '2026-08-30 09:00:00',
  latestDraftId: null as string | null,
}));
ledgers.forEach((l: any) => {
  ledgerIdByEmsId[l.emsId] = l.id;
  ledgerById[l.id] = l;
});

// ===== 县调申报 =====
export const drafts: any[] = seed.drafts.map((d: any, i: number) => ({
  id: 'CD' + pad3(i + 1),
  targetLedgerId: d.targetEmsId ? (ledgerIdByEmsId[d.targetEmsId] ?? null) : null,
  templateId: tplIdByName[d.templateName] ?? null,
  areaName: d.areaName,
  editBy: d.editBy,
  payload: JSON.stringify(d.payload),
  status: d.status,
  editTime: d.editTime,
  updateDataDateTime: d.editTime,
}));
// PENDING 申报回填台账 latestDraftId(批量归档候选判断依赖)
drafts.forEach((d) => {
  if (d.targetLedgerId && d.status === 'PENDING') {
    const led = ledgers.find((l) => l.id === d.targetLedgerId);
    if (led) led.latestDraftId = d.id;
  }
});

// ===== 归档留痕 =====
export const archives: any[] = seed.archives.map((a: any, i: number) => ({
  id: 'ARC' + pad3(i + 1),
  ledgerId: ledgerIdByEmsId[a.ledgerEmsId] ?? a.ledgerEmsId,
  ledgerName: a.ledgerName,
  draftId: 'SEED-' + a.ledgerEmsId,
  archiveType: a.archiveType,
  archiveScope: 'LEDGER',
  archiveBy: a.archiveBy,
  archiveTime: '2026-08-28 10:00:00',
  reviewer: a.reviewer,
  reviewTime: '2026-08-28 14:00:00',
  reviewOpinion: a.opinion,
  reviewStatus: a.reviewStatus,
  archiveData: JSON.stringify({ deviceName: a.ledgerName, archiveStatus: 'ARCHIVED' }),
}));

// ===== 上报批次/明细 =====
export const batches: any[] = seed.batches.map((b: any) => ({
  id: 'RPB' + b.seq,
  batchNo: 'RP2026090' + b.seq,
  targetSystem: 'OMS',
  totalCount: b.totalCount,
  successCount: b.successCount,
  failCount: b.failCount,
  pendingCount: b.totalCount - b.successCount - b.failCount,
  status: b.status,
  triggerBy: 'seed',
  triggerTime: '2026-08-2' + b.seq + ' 10:00:00',
  finishTime: b.status === 'DONE' ? '2026-08-2' + b.seq + ' 10:05:00' : null,
  approvedCount: 0,
  rejectedCount: 0,
}));
export const batchDetails: any[] = seed.reports.map((r: any, i: number) => {
  const led = ledgerById[ledgerIdByEmsId[r.ledgerEmsId]] ?? null;
  return {
    id: 'DTL' + pad3(i + 1),
    batchId: 'RPB' + r.batchSeq,
    ledgerId: ledgerIdByEmsId[r.ledgerEmsId] ?? r.ledgerEmsId,
    deviceName: led ? led.deviceName : r.ledgerEmsId,
    areaName: led ? led.areaName : '-',
    status: r.status,
    reviewStatus: r.reviewStatus,
    attemptCount: r.attemptCount,
    responseMsg: r.responseMsg,
    reportTime: r.status === 'REPORTED' ? '2026-08-28 10:10:00' : null,
    reviewTime: r.reviewTime === 'Y' ? '2026-08-29 09:00:00' : (r.reviewStatus === 'APPROVED' || r.reviewStatus === 'REJECTED') && r.status === 'REPORTED' ? '2026-08-29 09:00:00' : null,
    reportData: led ? JSON.stringify({ deviceName: led.deviceName, ratedCapacity: led.ratedCapacity }) : '{}',
  };
});

// ===== 省地同步日志 =====
export const syncLogs: any[] = seed.syncLogs.map((sl: any, i: number) => ({
  id: 'SL' + String(i + 1).padStart(3, '0'),
  syncBatch: sl.syncBatch,
  status: sl.status,
  totalCount: sl.totalCount,
  successCount: sl.successCount,
  failCount: sl.totalCount - sl.successCount,
  startTime: sl.startTime,
  endTime: sl.endTime,
  errorMsg: sl.errorMsg ?? '',
  remark: sl.remark ?? '',
}));
