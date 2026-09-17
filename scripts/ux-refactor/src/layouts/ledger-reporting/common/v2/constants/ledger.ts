/**
 * 台账模块统一常量定义
 * 与后端 com.tech.cz.resource.enums 包对应
 * 后端 PO 字段 DB 存数字 value，JSON 序列化输出英文 name()，前后端统一使用英文 name
 */

/** 省地比对状态 (CompareStatus) - key 为后端枚举 name()，value 为中文 label */
export const COMPARE_STATUS = {
  DIFFERENT: '数据不一致',
  LOCAL_ONLY: '仅本地有',
  PROVINCIAL_ONLY: '仅省调有',
  MATCH: '匹配',
} as const;

/** 省地比对状态颜色映射（按 name 匹配） */
export const COMPARE_STATUS_COLOR: Record<string, string> = {
  MATCH: 'green',
  DIFFERENT: 'orange',
  LOCAL_ONLY: 'blue',
  PROVINCIAL_ONLY: 'purple',
};

/** 上报状态 (ReportStatus) - key 为后端枚举 name() */
export const REPORT_STATUS = {
  PENDING: '待上报',
  REPORTED: '已上报',
  REPORTING: '上报中',
  FAILED: '上报失败',
  CANCELLED: '已取消',
  DRAFT: '草稿',
  GENERATED: '已生成',
  ARCHIVED: '已归档',
  FEEDBACK: '已反馈',
} as const;

/** 上报状态下拉选项（value 对齐后端 name()） */
export const REPORT_STATUS_OPTIONS = [
  { label: '待上报', value: 'PENDING', color: 'blue' },
  { label: '已生成', value: 'GENERATED', color: 'cyan' },
  { label: '已上报', value: 'REPORTED', color: 'green' },
  { label: '上报中', value: 'REPORTING', color: 'processing' },
  { label: '上报失败', value: 'FAILED', color: 'red' },
  { label: '已取消', value: 'CANCELLED', color: 'default' },
  { label: '草稿', value: 'DRAFT', color: 'default' },
  { label: '已归档', value: 'ARCHIVED', color: 'purple' },
  { label: '已反馈', value: 'FEEDBACK', color: 'cyan' },
] as const;

/** code（英文 name）→ 中文标签 */
export function getReportStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (REPORT_STATUS as Record<string, string>)[code] ?? code;
}

/** code → antd tag color */
export function getReportStatusColor(code?: string | null): string {
  if (code === null || code === undefined || code === '') return 'default';
  return REPORT_STATUS_OPTIONS.find(o => o.value === code)?.color ?? 'default';
}

/** 同步来源 (SyncSource) - key 为后端枚举 name() */
export const SYNC_SOURCE = {
  D5000_EMS: '省调D5000',
  PROVINCIAL: '省调同步',
  OMS: 'OMS系统',
  LOCAL: '本地录入',
  NEW_GEN: '新能源平台',
  D5000: 'D5000平台',
  CLOUD_CURVE: '云曲线平台',
  MANUAL: '手动导入',
} as const;

/** 同步来源下拉选项（value 对齐后端 name()） */
export const SYNC_SOURCE_OPTIONS = [
  { label: '省调D5000', value: 'D5000_EMS' },
  { label: '省调同步', value: 'PROVINCIAL' },
  { label: 'OMS系统', value: 'OMS' },
  { label: '本地录入', value: 'LOCAL' },
  { label: '新能源平台', value: 'NEW_GEN' },
  { label: 'D5000平台', value: 'D5000' },
  { label: '云曲线平台', value: 'CLOUD_CURVE' },
  { label: '手动导入', value: 'MANUAL' },
] as const;

/** code（英文 name）→ 中文标签 */
export function getSyncSourceLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (SYNC_SOURCE as Record<string, string>)[code] ?? code;
}

/** 设备类型 (DeviceType) - key 为后端枚举 name() */
export const DEVICE_TYPE = {
  THERMAL: '火电',
  HYDRO: '水电',
  PUMPED_STORAGE: '抽蓄',
  NUCLEAR: '核电',
  GAS: '燃气',
  BIOMASS: '生物质',
  WIND: '风电',
  SOLAR: '光伏',
  STORAGE: '储能',
  OTHER: '其他',
  OTHER_RENEWABLE: '其他可再生能源',
} as const;

/** 设备类型下拉选项（value 对齐后端 name()） */
export const DEVICE_TYPE_OPTIONS = Object.entries(DEVICE_TYPE).map(([value, label]) => ({ value, label }));

/** 设备运行状态 - 注意：deviceStatus 字段后端无 @EnumCode、无 normalize，
 * 实际值为写入方传入的原值（本地录入传英文 running/stopped/maintenance，省调同步派生自 emsStatus）。
 * 此处 value 用 '1'/'0'/'2' 仅为本地录入场景的目标编码，getDeviceStatusLabel 已兼容多来源值。 */
export const DEVICE_STATUS = {
  RUNNING: '运行',
  STOPPED: '停运',
  MAINTENANCE: '检修',
} as const;

/** 设备状态下拉选项（value 对齐后端 normalizeStatus 返回值） */
export const DEVICE_STATUS_OPTIONS = [
  { label: '运行', value: '1' },
  { label: '停运', value: '0' },
  { label: '检修', value: '2' },
] as const;

/** 设备状态 code → 中文标签 */
export function getDeviceStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  const item = DEVICE_STATUS_OPTIONS.find(o => o.value === code);
  if (item) return item.label;
  // 兼容历史数据：直接是中文或英文
  if (code === 'running') return '运行';
  if (code === 'stopped') return '停运';
  if (code === 'maintenance') return '检修';
  if (code === '运行' || code === '停运' || code === '检修') return code;
  return code;
}

/** 审核状态 (ReviewStatus) - 归档记录的审核结论轴
 * 归档动作即时出具结论(确认/驳回),不存在"待审核"挂起态 */
export const REVIEW_STATUS = {
  APPROVED: '已通过',
  REJECTED: '已驳回',
} as const;

/** 字段类型（与后端 TemplateTab.fieldTypeOptions 对齐） */
export const FIELD_TYPES = ['STRING', 'INTEGER', 'DECIMAL', 'DATE', 'DATETIME', 'BOOLEAN', 'ENUM'] as const;

/** 按字段名推断映射类型 */
export function inferMappingType(fieldName?: string | null): string {
  if (!fieldName) return 'STRING';
  const name = fieldName.toLowerCase();
  if (['ratedcapacity', 'pmax', 'pmin', 'ratedcurrent', 'kvnom', 'installedcapacity'].includes(name)) return 'DECIMAL';
  if (['commissiondate', 'reporttime', 'feedbacktime', 'archivetime', 'synctime'].includes(name)) return 'DATETIME';
  if (['reportstatus', 'devicestatus', 'devicetype', 'syncsource'].includes(name)) return 'ENUM';
  if (['remark'].includes(name)) return 'STRING';
  return 'STRING';
}

/** 归档状态 (ArchiveStatus) - key 为后端枚举 name()，对应 @EnumCode(ArchiveStatus.class) */
export const ARCHIVE_STATUS = {
  UNARCHIVED: '未归档',
  PENDING: '待审核',
  ARCHIVED: '已归档',
  REJECTED: '审核驳回',
} as const;

/** 归档状态下拉选项（value 对齐后端 name()） */
export const ARCHIVE_STATUS_OPTIONS = [
  { label: '未归档', value: 'UNARCHIVED', color: 'default' },
  { label: '待审核', value: 'PENDING', color: 'orange' },
  { label: '已归档', value: 'ARCHIVED', color: 'green' },
  { label: '审核驳回', value: 'REJECTED', color: 'red' },
] as const;

/** code（英文 name）→ 中文标签 */
export function getArchiveStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (ARCHIVE_STATUS as Record<string, string>)[code] ?? code;
}

/** code → antd tag color */
export function getArchiveStatusColor(code?: string | null): string {
  if (code === null || code === undefined || code === '') return 'default';
  return ARCHIVE_STATUS_OPTIONS.find(o => o.value === code)?.color ?? 'default';
}

/** 数据基准来源 (DataBaseline) - key 为后端枚举 name()，对应 @EnumCode(DataBaseline.class) */
export const DATA_BASELINE = {
  PROVINCIAL: '省调为准',
  LOCAL: '地调为准',
  COUNTY: '县调为准',
} as const;

/** 数据基准来源下拉选项（value 对齐后端 name()） */
export const DATA_BASELINE_OPTIONS = [
  { label: '省调为准', value: 'PROVINCIAL' },
  { label: '地调为准', value: 'LOCAL' },
  { label: '县调为准', value: 'COUNTY' },
] as const;

/** code（英文 name）→ 中文标签 */
export function getDataBaselineLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (DATA_BASELINE as Record<string, string>)[code] ?? code;
}

/** 县调申报状态(简化模型,对齐原始需求:县调维护上报→地调确认/驳回,无草稿/撤销中间态)
 * key 对齐 mock/后端状态名 */
export const DRAFT_STATUS = {
  PENDING: '待地调确认',
  APPROVED: '地调已确认',
  REJECTED: '地调已驳回',
} as const;

/** 县调申报状态下拉选项（value 对齐状态名） */
export const DRAFT_STATUS_OPTIONS = [
  { label: '待地调确认', value: 'PENDING', color: 'orange' },
  { label: '地调已确认', value: 'APPROVED', color: 'green' },
  { label: '地调已驳回', value: 'REJECTED', color: 'red' },
] as const;

/** code（英文 name）→ 中文标签 */
export function getDraftStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (DRAFT_STATUS as Record<string, string>)[code] ?? code;
}

/** code → antd tag color */
export function getDraftStatusColor(code?: string | null): string {
  if (code === null || code === undefined || code === '') return 'default';
  return DRAFT_STATUS_OPTIONS.find(o => o.value === code)?.color ?? 'default';
}

/** 审核状态下拉选项（value 对齐后端 name()，REVIEW_STATUS 已定义于上方） */
export const REVIEW_STATUS_OPTIONS = [
  { label: '已通过', value: 'APPROVED', color: 'green' },
  { label: '已驳回', value: 'REJECTED', color: 'red' },
] as const;

/** code（英文 name）→ 中文标签 */
export function getReviewStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (REVIEW_STATUS as Record<string, string>)[code] ?? code;
}

/** code → antd tag color */
export function getReviewStatusColor(code?: string | null): string {
  if (code === null || code === undefined || code === '') return 'default';
  return REVIEW_STATUS_OPTIONS.find(o => o.value === code)?.color ?? 'default';
}

/** 归档类型 (ArchiveType) - key 为后端枚举 name()，对应 @EnumCode(ArchiveType.class) */
export const ARCHIVE_TYPE = {
  NEW: '新增台账',
  UPDATE: '变更台账',
} as const;

/** code（英文 name）→ 中文标签 */
export function getArchiveTypeLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (ARCHIVE_TYPE as Record<string, string>)[code] ?? code;
}

/** 同步状态 (SyncStatus) - key 为后端枚举 name()，对应 @EnumCode(SyncStatus.class)
 * 用于省调数据拉取同步、归档催办等场景 */
export const SYNC_STATUS = {
  RUNNING: '进行中',
  SUCCESS: '成功',
  PARTIAL: '部分失败',
  FAILED: '全部失败',
} as const;

/** code（英文 name）→ 中文标签 */
export function getSyncStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (SYNC_STATUS as Record<string, string>)[code] ?? code;
}

/** 批次状态 (BatchStatus) - key 为后端枚举 name()，对应 @EnumCode(BatchStatus.class) */
export const BATCH_STATUS = {
  ASSEMBLING: '组装中',
  READY: '待执行',
  RUNNING: '执行中',
  DONE: '已完成',
  CANCELLED: '已取消',
  FAILED: '失败',
} as const;

/** 批次状态 tag 颜色映射（按 name） */
export const BATCH_STATUS_COLOR: Record<string, string> = {
  ASSEMBLING: 'default',
  READY: 'blue',
  RUNNING: 'processing',
  DONE: 'green',
  CANCELLED: 'default',
  FAILED: 'red',
};

/** code（英文 name）→ 中文标签 */
export function getBatchStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '-';
  return (BATCH_STATUS as Record<string, string>)[code] ?? code;
}

/** code → antd tag color */
export function getBatchStatusColor(code?: string | null): string {
  if (code === null || code === undefined || code === '') return 'default';
  return BATCH_STATUS_COLOR[code] ?? 'default';
}

/** 上报明细状态 tag 颜色映射（复用 REPORT_STATUS，按 name） */
export const REPORT_STATUS_COLOR_MAP: Record<string, string> = {
  PENDING: 'blue',
  REPORTING: 'processing',
  REPORTED: 'green',
  FAILED: 'red',
  CANCELLED: 'default',
  DRAFT: 'default',
  GENERATED: 'cyan',
  ARCHIVED: 'purple',
  FEEDBACK: 'cyan',
};

/** code → antd tag color（上报明细状态专用，覆盖 REPORT_STATUS_OPTIONS 缺失项） */
export function getReportStatusTagColor(code?: string | null): string {
  if (code === null || code === undefined || code === '') return 'default';
  return REPORT_STATUS_COLOR_MAP[code] ?? 'default';
}

/** ====== 专业审核状态 (LedgerReviewStatus, CR-010 新增审核轴) ======
 * 与上方 REVIEW_STATUS(归档审核)不同:本组是省调对上报明细的专业审核轴,
 * key 对齐后端 LedgerReviewStatus 枚举 name() */
export const LEDGER_REVIEW_STATUS = {
  IN_REVIEW: '专业审核中',
  APPROVED: '已通过',
  REJECTED: '未通过',
} as const;

/** 专业审核状态下拉选项 */
export const LEDGER_REVIEW_STATUS_OPTIONS = [
  { label: '专业审核中', value: 'IN_REVIEW', color: 'processing' },
  { label: '已通过', value: 'APPROVED', color: 'green' },
  { label: '未通过', value: 'REJECTED', color: 'red' },
] as const;

/** 专业审核状态 code → 中文标签（null/空 = 未进入审核） */
export function getLedgerReviewStatusLabel(code?: string | null): string {
  if (code === null || code === undefined || code === '') return '未进入审核';
  return (LEDGER_REVIEW_STATUS as Record<string, string>)[code] ?? code;
}

/** 专业审核状态 code → antd tag color */
export function getLedgerReviewStatusColor(code?: string | null): string {
  if (code === null || code === undefined || code === '') return 'default';
  return LEDGER_REVIEW_STATUS_OPTIONS.find(o => o.value === code)?.color ?? 'default';
}

/** ====== 语义色统一常量（全模块唯一来源，组件内禁止裸写 hex）======
 * 依据 b-end-design-rules §1 CL-2 / §5：语义色收敛 token，换主题只改这里 */
export const SEMANTIC_COLOR = {
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  primary: '#1677ff',
} as const;

/** 设备状态 → tag 色（CL-2a：正常态不着色，单一实现供各页共用）
 * 运行=中性灰（多数正常态不着色）；检修=orange；停运=red。
 * 兼容 '1'/'0'/'2' 与 'running'/'stopped'/'maintenance' 两种存储值 */
export function getDeviceStatusTagColor(code?: string | null): string {
  const s = String(code ?? '');
  if (s === '0' || s === 'stopped' || s === '停运') return 'red';
  if (s === '2' || s === 'maintenance' || s === '检修') return 'orange';
  return 'default';
}

/** ====== 台账宽表列（模板"统一字段"白名单）======
 * 字段名命中此表的模板字段 = 统一字段,直存台账宽表列;
 * 未命中的 = 模板特有字段,存台账 EXTRA_DATA(JSON)。与后端 LedgerCompareUtil.LOCAL_LEDGER_COLUMNS 口径一致 */
export const LEDGER_COLUMN_CN: Record<string, string> = {
  deviceName: '台账名称', deviceType: '设备类型', emsId: 'EMS标识', stationName: '厂站',
  kvnom: '电压等级(kV)', pmax: '出力上限(MW)', pmin: '出力下限(MW)', ratedCapacity: '额定容量(MW)',
  ratedCurrent: '额定电流', emsStatus: 'EMS状态', runState: '运行状态', deviceStatus: '设备状态',
  areaName: '所属县区', emsRegionId: 'EMS分区', divisionId: '网格分区', dispatchRelation: '调度关系',
  manufacturer: '厂家', modelNo: '型号', commissionDate: '投运日期', remark: '备注',
};

/** 本地字段中文名展示(命中统一字段带中文名,特有字段原样) */
export function ledgerFieldLabel(name: string): string {
  return LEDGER_COLUMN_CN[name] ? `${LEDGER_COLUMN_CN[name]}(${name})` : name;
}
