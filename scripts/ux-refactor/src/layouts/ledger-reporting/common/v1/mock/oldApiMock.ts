/**
 * 旧版页面 mock 数据层（axios adapter 按 URL 路由）
 *
 * 作品集演示专用：before 版本原本直连后端 API，为保证纯前端可运行，
 * 在 axios 实例上挂自定义 adapter，按 URL 模式返回模拟响应。
 * 数据口径对齐旧版页面消费契约：英文码枚举（constants/ledger.ts 翻译）+
 * res.data.list / res.data.total 分页结构。
 * 所有厂站/设备/人名均为虚构。
 */

// ===== 工具 =====
const ok = (data: any) => ({ code: 0, msg: 'ok', data });

const listOk = (list: any[], params?: any) => {
  const pageNum = Number(params?.pageNum) || 1;
  const pageSize = Number(params?.pageSize) || 50;
  const start = (pageNum - 1) * pageSize;
  return ok({ list: list.slice(start, start + pageSize), total: list.length });
};

// ===== 基础字典（区划为常州行政区划，厂站/设备/人名虚构） =====
const COUNTIES = ['溧阳市', '金坛区', '武进区', '新北区', '天宁区', '钟楼区'];
const T = '2026-08-28 10:30:00';

const DEVICE_TYPE_LABELS: Record<string, string> = {
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
};

// ===== 台账池 =====
const ledgers = [
  { id: 'LG001', emsId: 'MOCK-LG01', code: 'LEDG01', deviceName: '龙湖电厂#1机组', stationName: '龙湖电厂', deviceType: 'THERMAL', ratedCapacity: 660, kvnom: 220, pmax: 660, pmin: 330, areaName: '新北区', dispatchRelation: '省调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'ARCHIVED', syncSource: 'D5000_EMS', dataBaseline: '2026-08-01', updateDataDateTime: T },
  { id: 'LG002', emsId: 'MOCK-LG02', code: 'LEDG02', deviceName: '龙湖电厂#2机组', stationName: '龙湖电厂', deviceType: 'THERMAL', ratedCapacity: 660, kvnom: 220, pmax: 660, pmin: 330, areaName: '新北区', dispatchRelation: '省调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'ARCHIVED', syncSource: 'PROVINCIAL', dataBaseline: '2026-08-01', updateDataDateTime: T },
  { id: 'LG003', emsId: 'MOCK-LG03', code: 'LEDG03', deviceName: '滆湖水电厂#1机组', stationName: '滆湖水电厂', deviceType: 'HYDRO', ratedCapacity: 45, kvnom: 110, pmax: 45, pmin: 10, areaName: '武进区', dispatchRelation: '地调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'ARCHIVED', syncSource: 'D5000_EMS', dataBaseline: '2026-08-01', updateDataDateTime: T },
  { id: 'LG004', emsId: 'MOCK-LG04', code: 'LEDG04', deviceName: '茅山抽蓄#1机组', stationName: '茅山抽蓄电站', deviceType: 'PUMPED_STORAGE', ratedCapacity: 300, kvnom: 500, pmax: 300, pmin: -300, areaName: '金坛区', dispatchRelation: '省调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'PENDING', syncSource: 'PROVINCIAL', dataBaseline: '2026-08-15', updateDataDateTime: T },
  { id: 'LG005', emsId: 'MOCK-LG05', code: 'LEDG05', deviceName: '长荡湖风电场一期', stationName: '长荡湖风电场', deviceType: 'WIND', ratedCapacity: 100, kvnom: 220, pmax: 100, pmin: 0, areaName: '金坛区', dispatchRelation: '地调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'UNARCHIVED', syncSource: 'D5000_EMS', dataBaseline: '2026-08-20', updateDataDateTime: T },
  { id: 'LG006', emsId: 'MOCK-LG06', code: 'LEDG06', deviceName: '天目湖光伏电站', stationName: '天目湖光伏', deviceType: 'SOLAR', ratedCapacity: 80, kvnom: 110, pmax: 80, pmin: 0, areaName: '溧阳市', dispatchRelation: '地调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'ARCHIVED', syncSource: 'PROVINCIAL', dataBaseline: '2026-08-01', updateDataDateTime: T },
  { id: 'LG007', emsId: 'MOCK-LG07', code: 'LEDG07', deviceName: '南山储能电站', stationName: '南山储能', deviceType: 'STORAGE', ratedCapacity: 50, kvnom: 110, pmax: 50, pmin: -50, areaName: '溧阳市', dispatchRelation: '地调调度', deviceStatus: '0', runState: '停运', archiveStatus: 'ARCHIVED', syncSource: 'LOCAL', dataBaseline: '2026-08-01', updateDataDateTime: T },
  { id: 'LG008', emsId: 'MOCK-LG08', code: 'LEDG08', deviceName: '横山燃气机组', stationName: '横山燃机电厂', deviceType: 'GAS', ratedCapacity: 400, kvnom: 220, pmax: 400, pmin: 200, areaName: '天宁区', dispatchRelation: '省调调度', deviceStatus: '2', runState: '检修', archiveStatus: 'ARCHIVED', syncSource: 'D5000_EMS', dataBaseline: '2026-08-01', updateDataDateTime: T },
  { id: 'LG009', emsId: 'MOCK-LG09', code: 'LEDG09', deviceName: '运河生物质电厂', stationName: '运河生物质', deviceType: 'BIOMASS', ratedCapacity: 30, kvnom: 110, pmax: 30, pmin: 8, areaName: '钟楼区', dispatchRelation: '地调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'ARCHIVED', syncSource: 'OMS', dataBaseline: '2026-08-01', updateDataDateTime: T },
  { id: 'LG010', emsId: 'MOCK-LG10', code: 'LEDG10', deviceName: '雪堰分布式光伏', stationName: '雪堰光伏', deviceType: 'SOLAR', ratedCapacity: 20, kvnom: 35, pmax: 20, pmin: 0, areaName: '武进区', dispatchRelation: '县调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'UNARCHIVED', syncSource: 'LOCAL', dataBaseline: '2026-08-25', updateDataDateTime: T },
  { id: 'LG011', emsId: 'MOCK-LG11', code: 'LEDG11', deviceName: '直湖港风电二期', stationName: '直湖港风电场', deviceType: 'WIND', ratedCapacity: 60, kvnom: 110, pmax: 60, pmin: 0, areaName: '新北区', dispatchRelation: '地调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'PENDING', syncSource: 'PROVINCIAL', dataBaseline: '2026-08-22', updateDataDateTime: T },
  { id: 'LG012', emsId: 'MOCK-LG12', code: 'LEDG12', deviceName: '金坛储能电站二期', stationName: '金坛储能', deviceType: 'STORAGE', ratedCapacity: 100, kvnom: 220, pmax: 100, pmin: -100, areaName: '金坛区', dispatchRelation: '省调调度', deviceStatus: '1', runState: '并网运行', archiveStatus: 'ARCHIVED', syncSource: 'D5000_EMS', dataBaseline: '2026-08-01', updateDataDateTime: T },
];

// ===== 上报批次池 =====
const batches = [
  { id: 'BT001', batchNo: 'PC20260801-01', templateId: 'TPL001', targetSystem: '省调平衡表', status: 'DONE', successFail: '9/9', progress: 100, totalCount: 9, successCount: 9, failCount: 0, triggerTime: '2026-08-01 09:00:00', operator: '张伟明' },
  { id: 'BT002', batchNo: 'PC20260810-01', templateId: 'TPL001', targetSystem: '省调平衡表', status: 'DONE', successFail: '11/12', progress: 100, totalCount: 12, successCount: 11, failCount: 1, triggerTime: '2026-08-10 09:00:00', operator: '张伟明' },
  { id: 'BT003', batchNo: 'PC20260820-01', templateId: 'TPL002', targetSystem: '调控云', status: 'DONE', successFail: '8/8', progress: 100, totalCount: 8, successCount: 8, failCount: 0, triggerTime: '2026-08-20 14:00:00', operator: '李国强' },
  { id: 'BT004', batchNo: 'PC20260826-01', templateId: 'TPL001', targetSystem: '省调平衡表', status: 'FAILED', successFail: '2/5', progress: 40, totalCount: 5, successCount: 2, failCount: 3, triggerTime: '2026-08-26 09:30:00', operator: '李国强' },
  { id: 'BT005', batchNo: 'PC20260829-01', templateId: 'TPL003', targetSystem: '省调平衡表', status: 'RUNNING', successFail: '1/3', progress: 33, totalCount: 3, successCount: 1, failCount: 0, triggerTime: '2026-08-29 10:00:00', operator: '王建华' },
  { id: 'BT006', batchNo: 'PC20260830-01', templateId: 'TPL001', targetSystem: '省调平衡表', status: 'READY', successFail: '0/0', progress: 0, totalCount: 0, successCount: 0, failCount: 0, triggerTime: '2026-08-30 09:00:00', operator: '王建华' },
];

// ===== 上报反馈池 =====
const feedbacks = [
  { id: 'FB001', batchId: 'BT001', ledgerId: 'LG001', status: 'REPORTED', attemptCount: 1, responseMsg: '上报成功', reportTime: '2026-08-01 09:05:00', totalCount: 9, successCount: 9, failCount: 0, successRatio: 100, feedbackTime: '2026-08-01 09:10:00', remark: '' },
  { id: 'FB002', batchId: 'BT002', ledgerId: 'LG004', status: 'REPORTED', attemptCount: 2, responseMsg: '首次失败后重试成功', reportTime: '2026-08-10 09:12:00', totalCount: 12, successCount: 11, failCount: 1, successRatio: 91.7, feedbackTime: '2026-08-10 09:20:00', remark: '省调侧校验超时' },
  { id: 'FB003', batchId: 'BT004', ledgerId: 'LG005', status: 'FAILED', attemptCount: 3, responseMsg: 'E-4017 通道故障', reportTime: '2026-08-26 09:40:00', totalCount: 5, successCount: 2, failCount: 3, successRatio: 40, feedbackTime: '2026-08-26 10:00:00', remark: '待通道恢复后重报' },
  { id: 'FB004', batchId: 'BT004', ledgerId: 'LG010', status: 'FAILED', attemptCount: 3, responseMsg: 'E-4017 通道故障', reportTime: '2026-08-26 09:41:00', totalCount: 5, successCount: 2, failCount: 3, successRatio: 40, feedbackTime: '2026-08-26 10:00:00', remark: '' },
  { id: 'FB005', batchId: 'BT005', ledgerId: 'LG012', status: 'REPORTING', attemptCount: 1, responseMsg: '上报中', reportTime: '2026-08-29 10:02:00', totalCount: 3, successCount: 1, failCount: 0, successRatio: 33.3, feedbackTime: '', remark: '' },
];

// ===== 县调申报池（countyEdit） =====
const countyEdits = [
  { id: 'CE001', targetLedgerId: 'LG005', deviceName: '长荡湖风电场一期', templateName: '风电场台账模板', areaName: '金坛区', editBy: '刘晓峰', status: 'SUBMITTED', editTime: '2026-08-27 15:20:00', payloadSummary: '{"ratedCapacity":"100","runState":"并网运行"}' },
  { id: 'CE002', targetLedgerId: 'LG010', deviceName: '雪堰分布式光伏', templateName: '光伏电站台账模板', areaName: '武进区', editBy: '陈志远', status: 'SUBMITTED', editTime: '2026-08-28 09:10:00', payloadSummary: '{"ratedCapacity":"20","kvnom":"35"}' },
  { id: 'CE003', targetLedgerId: 'LG004', deviceName: '茅山抽蓄#1机组', templateName: '机组台账模板', areaName: '金坛区', editBy: '刘晓峰', status: 'APPROVED', editTime: '2026-08-25 11:00:00', payloadSummary: '{"pmax":"300","pmin":"-300"}' },
  { id: 'CE004', targetLedgerId: 'LG007', deviceName: '南山储能电站', templateName: '储能电站台账模板', areaName: '溧阳市', editBy: '赵磊', status: 'DRAFT', editTime: '2026-08-24 16:40:00', payloadSummary: '{"ratedCapacity":"50"}' },
  { id: 'CE005', targetLedgerId: 'LG011', deviceName: '直湖港风电二期', templateName: '风电场台账模板', areaName: '新北区', editBy: '陈志远', status: 'REJECTED', editTime: '2026-08-23 10:30:00', payloadSummary: '{"ratedCapacity":"60"}' },
];

// ===== 归档历史池 =====
const archiveHistory = [
  { id: 'AR001', ledgerId: 'LG001', deviceName: '龙湖电厂#1机组', archiveType: 'UPDATE', archiveBy: '张伟明', archiveTime: '2026-08-02 10:00:00', reviewer: '地调·张伟明', reviewTime: '2026-08-02 10:05:00', reviewStatus: 'APPROVED', reviewOpinion: '核对无误' },
  { id: 'AR002', ledgerId: 'LG002', deviceName: '龙湖电厂#2机组', archiveType: 'UPDATE', archiveBy: '张伟明', archiveTime: '2026-08-02 10:02:00', reviewer: '地调·张伟明', reviewTime: '2026-08-02 10:06:00', reviewStatus: 'APPROVED', reviewOpinion: '' },
  { id: 'AR003', ledgerId: 'LG006', deviceName: '天目湖光伏电站', archiveType: 'NEW', archiveBy: '陈志远', archiveTime: '2026-08-12 14:30:00', reviewer: '地调·李国强', reviewTime: '2026-08-12 15:00:00', reviewStatus: 'APPROVED', reviewOpinion: '新投产，归档' },
  { id: 'AR004', ledgerId: 'LG009', deviceName: '运河生物质电厂', archiveType: 'UPDATE', archiveBy: '赵磊', archiveTime: '2026-08-18 09:20:00', reviewer: '地调·李国强', reviewTime: '2026-08-18 09:40:00', reviewStatus: 'REJECTED', reviewOpinion: '容量数据与中台不一致，退回修正' },
  { id: 'AR005', ledgerId: 'LG012', deviceName: '金坛储能电站二期', archiveType: 'NEW', archiveBy: '刘晓峰', archiveTime: '2026-08-22 16:00:00', reviewer: '地调·张伟明', reviewTime: '2026-08-22 16:30:00', reviewStatus: 'APPROVED', reviewOpinion: '' },
];

// ===== 模板池 =====
const templates = [
  { id: 'TPL001', templateName: '机组台账模板', templateType: 'THERMAL', version: 'v1', enabled: 'Y', createDataDateTime: '2026-07-01 09:00:00', fieldDefinition: JSON.stringify([
    { name: 'ratedCapacity', label: '额定容量(MW)', type: 'number', required: true, desc: '' },
    { name: 'kvnom', label: '并网电压等级(kV)', type: 'number', required: true, desc: '' },
    { name: 'pmax', label: '最大技术出力(MW)', type: 'number', required: true, desc: '' },
    { name: 'pmin', label: '最小技术出力(MW)', type: 'number', required: true, desc: '' },
    { name: 'dispatchRelation', label: '调度关系', type: 'string', required: true, desc: '' },
  ]) },
  { id: 'TPL002', templateName: '风电场台账模板', templateType: 'WIND', version: 'v1', enabled: 'Y', createDataDateTime: '2026-07-01 09:10:00', fieldDefinition: JSON.stringify([
    { name: 'ratedCapacity', label: '装机容量(MW)', type: 'number', required: true, desc: '' },
    { name: 'kvnom', label: '并网电压等级(kV)', type: 'number', required: true, desc: '' },
    { name: 'machineCount', label: '风机台数', type: 'number', required: false, desc: '' },
  ]) },
  { id: 'TPL003', templateName: '光伏电站台账模板', templateType: 'SOLAR', version: 'v1', enabled: 'Y', createDataDateTime: '2026-07-01 09:20:00', fieldDefinition: JSON.stringify([
    { name: 'ratedCapacity', label: '装机容量(MW)', type: 'number', required: true, desc: '' },
    { name: 'kvnom', label: '并网电压等级(kV)', type: 'number', required: true, desc: '' },
  ]) },
  { id: 'TPL004', templateName: '储能电站台账模板', templateType: 'STORAGE', version: 'v2', enabled: 'N', createDataDateTime: '2026-07-05 14:00:00', fieldDefinition: JSON.stringify([
    { name: 'ratedCapacity', label: '额定容量(MW)', type: 'number', required: true, desc: '' },
    { name: 'storageKwh', label: '额定电量(MWh)', type: 'number', required: false, desc: '' },
  ]) },
];

// ===== 映射池 =====
const mappings = [
  { id: 'MP001', templateId: 'TPL001', mappingName: '机组-省调平衡表映射', sourceField: 'ratedCapacity', targetField: 'RATED_CAPACITY', enabled: 'Y', updateDataDateTime: T },
  { id: 'MP002', templateId: 'TPL001', mappingName: '机组-EMS字段映射', sourceField: 'pmax', targetField: 'PMAX', enabled: 'Y', updateDataDateTime: T },
  { id: 'MP003', templateId: 'TPL002', mappingName: '风电-平衡表映射', sourceField: 'ratedCapacity', targetField: 'RATED_CAPACITY', enabled: 'Y', updateDataDateTime: T },
  { id: 'MP004', templateId: 'TPL003', mappingName: '光伏-平衡表映射', sourceField: 'ratedCapacity', targetField: 'CAPACITY', enabled: 'N', updateDataDateTime: T },
];

// ===== 省地对比行 =====
const compareRows = [
  { id: 'CP01', deviceName: '龙湖电厂#1机组', stationName: '龙湖电厂', areaName: '新北区', emsId: 'MOCK-LG01', compareStatus: 'MATCH', diffFieldCount: 0 },
  { id: 'CP02', deviceName: '龙湖电厂#2机组', stationName: '龙湖电厂', areaName: '新北区', emsId: 'MOCK-LG02', compareStatus: 'DIFFERENT', diffFieldCount: 2 },
  { id: 'CP03', deviceName: '滆湖水电厂#1机组', stationName: '滆湖水电厂', areaName: '武进区', emsId: 'MOCK-LG03', compareStatus: 'MATCH', diffFieldCount: 0 },
  { id: 'CP04', deviceName: '茅山抽蓄#1机组', stationName: '茅山抽蓄电站', areaName: '金坛区', emsId: 'MOCK-LG04', compareStatus: 'DIFFERENT', diffFieldCount: 1 },
  { id: 'CP05', deviceName: '天目湖光伏电站', stationName: '天目湖光伏', areaName: '溧阳市', emsId: 'MOCK-LG06', compareStatus: 'MATCH', diffFieldCount: 0 },
  { id: 'CP06', deviceName: '雪堰分布式光伏', stationName: '雪堰光伏', areaName: '武进区', emsId: '', compareStatus: 'LOCAL_ONLY', diffFieldCount: 0 },
  { id: 'CP07', deviceName: '长江燃机#1机组', stationName: '长江燃机电厂', areaName: '新北区', emsId: 'MOCK-PRV01', compareStatus: 'PROVINCIAL_ONLY', diffFieldCount: 0 },
  { id: 'CP08', deviceName: '溧阳抽蓄#2机组', stationName: '溧阳抽蓄电站', areaName: '溧阳市', emsId: 'MOCK-PRV02', compareStatus: 'PROVINCIAL_ONLY', diffFieldCount: 0 },
];

// ===== 省地同步日志 =====
const latestSyncLog = { id: 'SY001', status: 'SUCCESS', totalCount: 12, successCount: 12, failCount: 0, syncTime: '2026-08-28 06:00:00', operator: '系统定时' };
const syncLogList = [
  latestSyncLog,
  { id: 'SY002', status: 'PARTIAL', totalCount: 11, successCount: 10, failCount: 1, syncTime: '2026-08-27 06:00:00', operator: '系统定时' },
  { id: 'SY003', status: 'FAILED', totalCount: 11, successCount: 0, failCount: 11, syncTime: '2026-08-26 06:00:00', operator: '系统定时' },
];

// ===== 县调统计矩阵 =====
const countyStatsData = {
  areaNames: COUNTIES,
  deviceTypes: ['THERMAL', 'HYDRO', 'PUMPED_STORAGE', 'GAS', 'WIND', 'SOLAR', 'STORAGE', 'BIOMASS'],
  deviceTypeLabels: DEVICE_TYPE_LABELS,
  rows: [
    { areaName: '溧阳市', THERMAL: 0, HYDRO: 0, PUMPED_STORAGE: 0, GAS: 0, WIND: 0, SOLAR: 80, STORAGE: 50, BIOMASS: 0, totalCapacityCol: '130 MW', _total: '2台' },
    { areaName: '金坛区', THERMAL: 0, HYDRO: 0, PUMPED_STORAGE: 300, GAS: 0, WIND: 160, SOLAR: 0, STORAGE: 100, BIOMASS: 0, totalCapacityCol: '560 MW', _total: '4台' },
    { areaName: '武进区', THERMAL: 0, HYDRO: 45, PUMPED_STORAGE: 0, GAS: 0, WIND: 0, SOLAR: 20, STORAGE: 0, BIOMASS: 0, totalCapacityCol: '65 MW', _total: '2台' },
    { areaName: '新北区', THERMAL: 1320, HYDRO: 0, PUMPED_STORAGE: 0, GAS: 0, WIND: 60, SOLAR: 0, STORAGE: 0, BIOMASS: 0, totalCapacityCol: '1380 MW', _total: '3台' },
    { areaName: '天宁区', THERMAL: 0, HYDRO: 0, PUMPED_STORAGE: 0, GAS: 400, WIND: 0, SOLAR: 0, STORAGE: 0, BIOMASS: 0, totalCapacityCol: '400 MW', _total: '1台' },
    { areaName: '钟楼区', THERMAL: 0, HYDRO: 0, PUMPED_STORAGE: 0, GAS: 0, WIND: 0, SOLAR: 0, STORAGE: 0, BIOMASS: 30, totalCapacityCol: '30 MW', _total: '1台' },
  ],
  grandTotal: { count: 13, capacity: 2565 },
  topArea: '新北区',
};

// ===== 归档提醒 =====
const remindLatest = { status: 'SUCCESS', scanTime: '2026-08-28 07:00:00', withinDays: 7, unarchivedCount: 2 };

// ===== 路由表 =====
const filterLedgers = (params: any) =>
  ledgers.filter((l) =>
    (!params?.areaName || l.areaName === params.areaName) &&
    (!params?.deviceName || l.deviceName.includes(params.deviceName)) &&
    (!params?.archiveStatus || l.archiveStatus === params.archiveStatus)
  );

const ROUTES: Array<[RegExp, (c: any) => any]> = [
  [/ledgerInfo\/list/, (c) => listOk(filterLedgers(c.params), c.params)],
  [/ledgerInfo\/info\//, () => ok(ledgers[0])],
  [/ledgerInfo\/(save|update|delete)/, () => ok(true)],
  [/ledgerInfo\/scanUnreported/, () => ok({ list: ledgers.filter((l) => l.archiveStatus === 'UNARCHIVED') })],
  [/ledgerInfo\/scanNewLedger/, () => ok({ list: [ledgers[4], ledgers[9], ledgers[10]] })],
  [/ledgerInfo\/scanReportFailed/, () => ok({ list: [ledgers[4]] })],
  [/ledgerInfo\/diffSummary/, () => ok({ totalCount: ledgers.length, unreportedCount: 2, newLedgerCount: 3, failedCount: 1, archivedCount: 9 })],
  [/ledgerInfo\/compareWithProvincial/, () => listOk(compareRows, { pageNum: 1, pageSize: 100 })],
  [/ledgerInfo\/compareSummary/, () => ok({ dm6Available: true, totalProvincial: 8, totalLocal: 12, matched: 5, different: 2, localOnly: 1, provincialOnly: 2 })],
  [/ledgerInfo\/countyStats/, () => ok(countyStatsData)],
  [/ledgerTemplate\/checkIntegrity/, () => ok({ totalCount: 10, okCount: 10, missing: [] })],
  [/ledgerTemplate\/toggleEnabled/, () => ok(true)],
  [/ledgerTemplate\/list/, (c) => listOk(templates, c.params)],
  [/ledgerTemplate\/info\//, () => ok(templates[0])],
  [/ledgerMapping\/countUnmappedByTemplate/, () => ok(0)],
  [/ledgerMapping\/resolvePreview/, () => ok({ list: [] })],
  [/ledgerMapping\/list/, (c) => listOk(mappings, c.params)],
  [/ledgerBatch\/list/, (c) => listOk(batches, c.params)],
  [/ledgerBatch\/(progress|detail)\//, () => ok({ status: 'DONE', progress: 100, totalCount: 9, successCount: 9, failCount: 0 })],
  [/ledgerBatch\/(assemble|createBatch|executeBatch|cancelBatch|retryFailed|retryDetail|autoCorrect|exportExcel)/, () => ok(true)],
  [/ledgerFeedback\/stats/, () => ok({ totalBatches: batches.length, totalCount: 45, successCount: 42, failCount: 3, successRate: 93.3 })],
  [/ledgerFeedback\/summaryByBatch/, () => ok({ totalCount: 12, successCount: 11, failCount: 1 })],
  [/ledgerFeedback\/list/, (c) => listOk(feedbacks, c.params)],
  [/ledgerArchive\/(approve|reject)/, () => ok(true)],
  [/ledgerArchive\/unarchivedList/, () => { const rows = ledgers.filter((l) => l.archiveStatus === 'UNARCHIVED'); return ok({ list: rows, total: rows.length }); }],
  [/ledgerArchive\/list/, (c) => listOk(archiveHistory, c.params)],
  [/archiveRemind\/latest/, () => ok(remindLatest)],
  [/archiveRemind\/stats/, () => ok({ unarchivedCount: 2, overdueCount: 1 })],
  [/archiveRemind\/trigger/, () => ok(true)],
  [/countyEdit\/list/, (c) => listOk(countyEdits, c.params)],
  [/countyEdit\/(saveDraft|submit|revoke)/, () => ok(true)],
  [/provincialSync\/latestLog/, () => ok(latestSyncLog)],
  [/provincialSync\/triggerSync/, () => ok({ status: 'SUCCESS', totalCount: 12, successCount: 12, failCount: 0, syncTime: T })],
  [/provincialSync\/list/, (c) => listOk(syncLogList, c.params)],
  [/areaInfo\/list/, () => ok({ list: COUNTIES.map((a) => ({ areaName: a })), total: COUNTIES.length })],
];

/** adapter 数据路由入口：返回 R 结构响应体 */
export function mockRoute(_method: string, url: string, config: any) {
  for (const [re, handler] of ROUTES) {
    if (re.test(url)) {
      return handler(config);
    }
  }
  console.warn('[oldApiMock] 未覆盖的 URL，返回空结构:', url);
  return ok({ list: [], total: 0 });
}
