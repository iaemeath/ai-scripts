import { createCrudApi } from './createCrudApi';
import request from './index';

// 透传出工厂生成的 api 对象，方便组件化页面直接用 useCrud(coalUnitApi)
// 同时保留旧的具名导出（xxxList / xxxInfo / xxxSave / xxxUpdate / xxxDelete），不破坏现有页面 import

// ====== 1.1 台账(P0 重构 2026-06) ======

const ledgerInfoApi = createCrudApi({
  module: 'ledger',
  resource: 'ledgerInfo',
  extra: {
    scanUnreported: { method: 'get', path: '/czBalance/resource/ledger/ledgerInfo/scanUnreported' },
    scanNewLedger: { method: 'get', path: '/czBalance/resource/ledger/ledgerInfo/scanNewLedger' },
    scanReportFailed: { method: 'get', path: '/czBalance/resource/ledger/ledgerInfo/scanReportFailed' },
    diffSummary: { method: 'get', path: '/czBalance/resource/ledger/ledgerInfo/diffSummary' },
    compareSummary: { method: 'get', path: '/czBalance/resource/ledger/ledgerInfo/compareSummary' },
  },
});
export const ledgerInfoList = ledgerInfoApi.list;
export const ledgerInfoInfo = ledgerInfoApi.info;
export const ledgerInfoSave = ledgerInfoApi.save;
export const ledgerInfoUpdate = ledgerInfoApi.update;
export const ledgerInfoDelete = ledgerInfoApi.delete;
export const scanUnreported = () =>
  request.get('/czBalance/resource/ledger/ledgerInfo/scanUnreported');
export const scanNewLedger = () =>
  request.get('/czBalance/resource/ledger/ledgerInfo/scanNewLedger');
export const scanReportFailed = () =>
  request.get('/czBalance/resource/ledger/ledgerInfo/scanReportFailed');
export const diffSummary = () =>
  request.get('/czBalance/resource/ledger/ledgerInfo/diffSummary');
export const compareWithProvincial = (params?: Record<string, any>) =>
  request.get('/czBalance/resource/ledger/ledgerInfo/compareWithProvincial', { params });
export const compareSummary = () =>
  request.get('/czBalance/resource/ledger/ledgerInfo/compareSummary');
export const countyStats = () =>
  request.get('/czBalance/resource/ledger/ledgerInfo/countyStats');

const archiveRemindApi = createCrudApi({
  module: 'ledger',
  resource: 'archiveRemind',
  extra: {
    latest: { method: 'get', path: '/czBalance/resource/ledger/archiveRemind/latest' },
    stats: { method: 'get', path: '/czBalance/resource/ledger/archiveRemind/stats' },
    trigger: { method: 'post', path: (days: any) => `/czBalance/resource/ledger/archiveRemind/trigger?withinDays=${days ?? 7}` },
  },
});
export const archiveRemindList = archiveRemindApi.list;
export const archiveRemindLatest = archiveRemindApi.latest;
export const archiveRemindStats = archiveRemindApi.stats;
export const archiveRemindTrigger = archiveRemindApi.trigger;

const ledgerTemplateApi = createCrudApi({
  module: 'ledger',
  resource: 'ledgerTemplate',
  extra: {
    checkIntegrity: { method: 'get', path: (id: string) => `/czBalance/resource/ledger/ledgerTemplate/checkIntegrity?templateId=${id}` },
    toggleEnabled: { method: 'post', path: (id: string, enabled: string) => `/czBalance/resource/ledger/ledgerTemplate/toggleEnabled?templateId=${id}&enabled=${enabled}` },
  },
});
export const ledgerTemplateList = ledgerTemplateApi.list;
export const ledgerTemplateInfo = ledgerTemplateApi.info;
export const ledgerTemplateSave = ledgerTemplateApi.save;
export const ledgerTemplateUpdate = ledgerTemplateApi.update;
export const ledgerTemplateDelete = ledgerTemplateApi.delete;
export const ledgerTemplateCheckIntegrity = ledgerTemplateApi.checkIntegrity;
export const ledgerTemplateToggleEnabled = ledgerTemplateApi.toggleEnabled;

const ledgerMappingApi = createCrudApi({
  module: 'ledger',
  resource: 'ledgerMapping',
  extra: {
    countUnmappedByTemplate: { method: 'get', path: (id: string) => `/czBalance/resource/ledger/ledgerMapping/countUnmappedByTemplate?templateId=${id}` },
    resolvePreview: { method: 'get', path: (id: string) => `/czBalance/resource/ledger/ledgerMapping/resolvePreview?templateId=${id}` },
  },
});
export const ledgerMappingList = ledgerMappingApi.list;
export const ledgerMappingInfo = ledgerMappingApi.info;
export const ledgerMappingSave = ledgerMappingApi.save;
export const ledgerMappingUpdate = ledgerMappingApi.update;
export const ledgerMappingDelete = ledgerMappingApi.delete;
export const ledgerMappingCountUnmapped = ledgerMappingApi.countUnmappedByTemplate;
export const ledgerMappingResolvePreview = ledgerMappingApi.resolvePreview;

const ledgerBatchApi = createCrudApi({
  module: 'ledger',
  resource: 'ledgerBatch',
  extra: {
    assemble: { method: 'post', path: '/czBalance/resource/ledger/ledgerBatch/assemble' },
    createBatch: { method: 'post', path: '/czBalance/resource/ledger/ledgerBatch/createBatch' },
    executeBatch: { method: 'post', path: '/czBalance/resource/ledger/ledgerBatch/executeBatch' },
    cancelBatch: { method: 'post', path: '/czBalance/resource/ledger/ledgerBatch/cancelBatch' },
    progress: { method: 'get', path: (id: string) => `/czBalance/resource/ledger/ledgerBatch/progress/${id}` },
    detail: { method: 'get', path: (id: string) => `/czBalance/resource/ledger/ledgerBatch/detail/${id}` },
    retryFailed: { method: 'post', path: '/czBalance/resource/ledger/ledgerBatch/retryFailed' },
    retryDetail: { method: 'post', path: '/czBalance/resource/ledger/ledgerBatch/retryDetail' },
    autoCorrect: { method: 'post', path: '/czBalance/resource/ledger/ledgerBatch/autoCorrect' },
  },
});
export const ledgerBatchList = ledgerBatchApi.list;
export const ledgerBatchAssemble = ledgerBatchApi.assemble;
export const ledgerBatchCreate = ledgerBatchApi.createBatch;
export const ledgerBatchExecute = ledgerBatchApi.executeBatch;
export const ledgerBatchCancel = ledgerBatchApi.cancelBatch;
export const ledgerBatchProgress = ledgerBatchApi.progress;
export const ledgerBatchDetail = ledgerBatchApi.detail;
export const ledgerBatchRetryFailed = ledgerBatchApi.retryFailed;
export const ledgerBatchRetryDetail = ledgerBatchApi.retryDetail;
export const ledgerBatchAutoCorrect = ledgerBatchApi.autoCorrect;

/** 导出批次上报数据为 Excel（文件下载） */
export const ledgerBatchExport = (batchId: string) =>
  request.get('/czBalance/resource/ledger/ledgerBatch/exportExcel', {
    params: { batchId },
    responseType: 'blob',
  });

const ledgerFeedbackApi = createCrudApi({
  module: 'ledger',
  resource: 'ledgerFeedback',
  extra: {
    submit: { method: 'post', path: '/czBalance/resource/ledger/ledgerFeedback/submit' },
    summaryByBatch: { method: 'get', path: (id: string) => `/czBalance/resource/ledger/ledgerFeedback/summaryByBatch?batchId=${id}` },
    stats: { method: 'get', path: '/czBalance/resource/ledger/ledgerFeedback/stats' },
  },
});
export const ledgerFeedbackList = ledgerFeedbackApi.list;
export const ledgerFeedbackInfo = ledgerFeedbackApi.info;
export const ledgerFeedbackSubmit = ledgerFeedbackApi.submit;
export const ledgerFeedbackSummaryByBatch = ledgerFeedbackApi.summaryByBatch;
export const ledgerFeedbackStats = ledgerFeedbackApi.stats;

const countyEditApi = createCrudApi({
  module: 'ledger',
  resource: 'countyEdit',
  extra: {
    saveDraft: { method: 'post', path: '/czBalance/resource/ledger/countyEdit/saveDraft' },
    submit: { method: 'post', path: '/czBalance/resource/ledger/countyEdit/submit' },
    revoke: { method: 'post', path: '/czBalance/resource/ledger/countyEdit/revoke' },
  },
});
export const countyEditList = countyEditApi.list;
export const countyEditInfo = countyEditApi.info;
export const countyEditSaveDraft = countyEditApi.saveDraft;
export const countyEditSubmit = countyEditApi.submit;
export const countyEditRevoke = countyEditApi.revoke;

const ledgerArchiveApi = createCrudApi({
  module: 'ledger',
  resource: 'ledgerArchive',
  extra: {
    approve: { method: 'post', path: '/czBalance/resource/ledger/ledgerArchive/approve' },
    reject: { method: 'post', path: '/czBalance/resource/ledger/ledgerArchive/reject' },
    unarchivedList: { method: 'get', path: (days: any) => `/czBalance/resource/ledger/ledgerArchive/unarchivedList?withinDays=${days ?? 7}` },
  },
});
export const ledgerArchiveList = ledgerArchiveApi.list;
export const ledgerArchiveInfo = ledgerArchiveApi.info;
export const ledgerArchiveApprove = ledgerArchiveApi.approve;
export const ledgerArchiveReject = ledgerArchiveApi.reject;
export const ledgerArchiveUnarchivedList = ledgerArchiveApi.unarchivedList;

const provincialSyncApi = createCrudApi({
  module: 'ledger',
  resource: 'provincialSync',
  extra: {
    triggerSync: { method: 'post', path: '/czBalance/resource/ledger/provincialSync/triggerSync' },
    latestLog: { method: 'get', path: '/czBalance/resource/ledger/provincialSync/latestLog' },
  },
});
export const provincialSyncTrigger = provincialSyncApi.triggerSync;
export const provincialSyncLatest = provincialSyncApi.latestLog;
export const provincialSyncList = provincialSyncApi.list;

// ====== 1.3 数据中台 ======

const apiConfigApi = createCrudApi({
  module: 'datacenter',
  resource: 'apiConfig',
  extra: {
    checkHealth: { method: 'post', path: '/czBalance/resource/datacenter/apiConfig/checkHealth' },
  },
});
export const apiConfigList = apiConfigApi.list;
export const apiConfigSave = apiConfigApi.save;
export const apiConfigUpdate = apiConfigApi.update;
export const apiConfigDelete = apiConfigApi.delete;
export const apiConfigCheckHealth = apiConfigApi.checkHealth;

const coalUnitApi = createCrudApi({ module: 'datacenter', resource: 'coalUnit' });
export const coalUnitList = coalUnitApi.list;
export const coalUnitSave = coalUnitApi.save;
export const coalUnitUpdate = coalUnitApi.update;
export const coalUnitDelete = coalUnitApi.delete;

const energyStorageApi = createCrudApi({ module: 'datacenter', resource: 'energyStorage' });
export const energyStorageList = energyStorageApi.list;
export const energyStorageSave = energyStorageApi.save;
export const energyStorageUpdate = energyStorageApi.update;
export const energyStorageDelete = energyStorageApi.delete;

const newEnergyApi = createCrudApi({ module: 'datacenter', resource: 'newEnergy' });
export const newEnergyList = newEnergyApi.list;
export const newEnergySave = newEnergyApi.save;
export const newEnergyUpdate = newEnergyApi.update;
export const newEnergyDelete = newEnergyApi.delete;

const virtualPowerPlantApi = createCrudApi({ module: 'datacenter', resource: 'virtualPowerPlant' });
export const virtualPowerPlantList = virtualPowerPlantApi.list;
export const virtualPowerPlantSave = virtualPowerPlantApi.save;
export const virtualPowerPlantUpdate = virtualPowerPlantApi.update;
export const virtualPowerPlantDelete = virtualPowerPlantApi.delete;

const microGridApi = createCrudApi({ module: 'datacenter', resource: 'microGrid' });
export const microGridList = microGridApi.list;
export const microGridSave = microGridApi.save;
export const microGridUpdate = microGridApi.update;
export const microGridDelete = microGridApi.delete;

const dataVersionApi = createCrudApi({
  module: 'datacenter',
  resource: 'dataVersion',
  extra: {
    compare: { method: 'get', path: (a: string, b: string) => `/czBalance/resource/datacenter/dataVersion/compare?versionA=${a}&versionB=${b}` },
    consecutiveDiffs: { method: 'get', path: '/czBalance/resource/datacenter/dataVersion/consecutiveDiffs' },
  },
});
export const dataVersionList = dataVersionApi.list;
export const dataVersionSave = dataVersionApi.save;
export const dataVersionUpdate = dataVersionApi.update;
export const dataVersionDelete = dataVersionApi.delete;
export const dataVersionCompare = dataVersionApi.compare;
export const dataVersionConsecutiveDiffs = dataVersionApi.consecutiveDiffs;

const apiCallLogApi = createCrudApi({ module: 'datacenter', resource: 'apiCallLog' });
export const apiCallLogList = apiCallLogApi.list;
export const apiCallLogSave = apiCallLogApi.save;
export const apiCallLogUpdate = apiCallLogApi.update;
export const apiCallLogDelete = apiCallLogApi.delete;

const nonDispatchUnitApi = createCrudApi({ module: 'datacenter', resource: 'nonDispatchUnit' });
export const nonDispatchUnitList = nonDispatchUnitApi.list;
export const nonDispatchUnitSave = nonDispatchUnitApi.save;
export const nonDispatchUnitUpdate = nonDispatchUnitApi.update;
export const nonDispatchUnitDelete = nonDispatchUnitApi.delete;

const stationContactApi = createCrudApi({ module: 'datacenter', resource: 'stationContact' });
export const stationContactList = stationContactApi.list;
export const stationContactSave = stationContactApi.save;
export const stationContactUpdate = stationContactApi.update;
export const stationContactDelete = stationContactApi.delete;

// ====== 1.4 分区汇聚 ======

const areaInfoApi = createCrudApi({ module: 'area', resource: 'areaInfo' });
export const areaInfoList = areaInfoApi.list;
export const areaInfoSave = areaInfoApi.save;
export const areaInfoUpdate = areaInfoApi.update;
export const areaInfoDelete = areaInfoApi.delete;

const areaBalanceApi = createCrudApi({ module: 'area', resource: 'areaBalance' });
export const areaBalanceList = areaBalanceApi.list;
export const areaBalanceSave = areaBalanceApi.save;
export const areaBalanceUpdate = areaBalanceApi.update;
export const areaBalanceDelete = areaBalanceApi.delete;

const tieLineApi = createCrudApi({ module: 'area', resource: 'tieLine' });
export const tieLineList = tieLineApi.list;
export const tieLineSave = tieLineApi.save;
export const tieLineUpdate = tieLineApi.update;
export const tieLineDelete = tieLineApi.delete;

const sectionInfoApi = createCrudApi({ module: 'area', resource: 'sectionInfo' });
export const sectionInfoList = sectionInfoApi.list;
export const sectionInfoSave = sectionInfoApi.save;
export const sectionInfoUpdate = sectionInfoApi.update;
export const sectionInfoDelete = sectionInfoApi.delete;

const sectionLimitApi = createCrudApi({ module: 'area', resource: 'sectionLimit' });
export const sectionLimitList = sectionLimitApi.list;
export const sectionLimitSave = sectionLimitApi.save;
export const sectionLimitUpdate = sectionLimitApi.update;
export const sectionLimitDelete = sectionLimitApi.delete;

const loadCurveApi = createCrudApi({ module: 'area', resource: 'loadCurve' });
export const loadCurveList = loadCurveApi.list;
export const loadCurveSave = loadCurveApi.save;
export const loadCurveUpdate = loadCurveApi.update;
export const loadCurveDelete = loadCurveApi.delete;

const balanceReportApi = createCrudApi({ module: 'area', resource: 'balanceReport' });
export const balanceReportList = balanceReportApi.list;
export const balanceReportSave = balanceReportApi.save;
export const balanceReportUpdate = balanceReportApi.update;
export const balanceReportDelete = balanceReportApi.delete;

/** 导出平衡报告为 Excel（文件下载） */
export const exportBalanceReport = (balanceDate?: string) =>
  request.get('/czBalance/resource/area/balanceReport/exportExcel', {
    params: balanceDate ? { balanceDate } : {},
    responseType: 'blob',
  });

/** 优化前后报告对比（T3） */
export const compareReport = (areaCode: string, reportDate: string) =>
  request.get('/czBalance/resource/area/compareReport', { params: { areaCode, reportDate } });

// ===== 统一告警 =====
const alarmApi = createCrudApi({ module: 'alarm', resource: 'list' });
export const alarmList = alarmApi.list;
/** 未读告警数（前端 badge） */
export const alarmUnreadCount = () => request.get('/czBalance/resource/alarm/unreadCount');
/** 标记已读 */
export const alarmMarkRead = (ids: string[]) => request.post('/czBalance/resource/alarm/markRead', ids);
/** 标记已处理 */
export const alarmResolve = (data: Record<string, any>) => request.post('/czBalance/resource/alarm/resolve', data);

/** 完整性扫描（T10） */
export const scanIntegrity = () => request.post('/czBalance/resource/validation/scanIntegrity');

const areaDeviceApi = createCrudApi({ module: 'area', resource: 'areaDevice' });
export const areaDeviceList = areaDeviceApi.list;
export const areaDeviceSave = areaDeviceApi.save;
export const areaDeviceUpdate = areaDeviceApi.update;
export const areaDeviceDelete = areaDeviceApi.delete;

// ====== 1.3 配电网 ======

const distributionNetworkApi = createCrudApi({ module: 'distribution', resource: 'distributionNetwork' });
export const distributionNetworkList = distributionNetworkApi.list;
export const distributionNetworkSave = distributionNetworkApi.save;
export const distributionNetworkUpdate = distributionNetworkApi.update;
export const distributionNetworkDelete = distributionNetworkApi.delete;

const feederInfoApi = createCrudApi({ module: 'distribution', resource: 'feederInfo' });
export const feederInfoList = feederInfoApi.list;
export const feederInfoSave = feederInfoApi.save;
export const feederInfoUpdate = feederInfoApi.update;
export const feederInfoDelete = feederInfoApi.delete;

const distributionChannelApi = createCrudApi({ module: 'distribution', resource: 'distributionChannel' });
export const distributionChannelList = distributionChannelApi.list;
export const distributionChannelSave = distributionChannelApi.save;
export const distributionChannelUpdate = distributionChannelApi.update;
export const distributionChannelDelete = distributionChannelApi.delete;

const distributionStdApi = createCrudApi({ module: 'distribution', resource: 'distributionStd' });
export const distributionStdList = distributionStdApi.list;
export const distributionStdSave = distributionStdApi.save;
export const distributionStdUpdate = distributionStdApi.update;
export const distributionStdDelete = distributionStdApi.delete;

const distributionQualityApi = createCrudApi({ module: 'distribution', resource: 'distributionQuality' });
export const distributionQualityList = distributionQualityApi.list;
export const distributionQualitySave = distributionQualityApi.save;
export const distributionQualityUpdate = distributionQualityApi.update;
export const distributionQualityDelete = distributionQualityApi.delete;

const userAccessApi = createCrudApi({ module: 'distribution', resource: 'userAccess' });
export const userAccessList = userAccessApi.list;
export const userAccessInfo = userAccessApi.info;
export const userAccessSave = userAccessApi.save;
export const userAccessUpdate = userAccessApi.update;
export const userAccessDelete = userAccessApi.delete;

// ===== Decision 2: User + UserConnection (two-table model) =====
const distributionUserApi = createCrudApi({ module: 'distribution', resource: 'distributionUser' });
export const distributionUserList = distributionUserApi.list;
export const distributionUserInfo = distributionUserApi.info;
export const distributionUserSave = distributionUserApi.save;
export const distributionUserUpdate = distributionUserApi.update;
export const distributionUserDelete = distributionUserApi.delete;
export const distributionUserStats = () =>
  request.get('/czBalance/resource/distribution/distributionUser/stats');
export const distributionUserMigrate = () =>
  request.post('/czBalance/resource/distribution/distributionUser/migrate');

const userConnectionApi = createCrudApi({ module: 'distribution', resource: 'userConnection' });
export const userConnectionList = userConnectionApi.list;
export const userConnectionSave = userConnectionApi.save;
export const userConnectionUpdate = userConnectionApi.update;
export const userConnectionDelete = userConnectionApi.delete;
export const userConnectionStatsNew = () =>
  request.get('/czBalance/resource/distribution/userConnection/stats');

// ===== Decision 3: stdExecute/applyRule (半执行) =====
export const stdExecuteApplyRule = (ruleId: string, recordType: string, recordId: string) =>
  request.post('/czBalance/resource/distribution/stdExecute/applyRule', { ruleId, recordType, recordId });

/** 检查单条规则的待转换记录数 */
export const stdExecuteCheckRecords = (ruleId: string) =>
  request.get('/czBalance/resource/distribution/stdExecute/checkRecords', { params: { ruleId } });

/** 执行单条规则（并记录执行日志） */
export const stdExecuteRule = (ruleId: string) =>
  request.post('/czBalance/resource/distribution/stdExecute/executeRule', { ruleId });

/** 标准化执行记录列表 */
const stdExecuteLogApi = createCrudApi({ module: 'distribution', resource: 'stdExecuteLog' });
export const stdExecuteLogList = stdExecuteLogApi.list;

// ===== Decision 4: qualityScan consistency + timeliness =====
export const qualityScanConsistency = () =>
  request.post('/czBalance/resource/distribution/qualityScan/consistency', {});
export const qualityScanTimeliness = (thresholdHours: number) =>
  request.post('/czBalance/resource/distribution/qualityScan/timeliness', { thresholdHours: String(thresholdHours) });

// ===== Decision 5: topologyNode + topologyEdge =====
const topologyNodeApi = createCrudApi({ module: 'distribution', resource: 'topologyNode' });
export const topologyNodeList = topologyNodeApi.list;
export const topologyNodeSave = topologyNodeApi.save;
export const topologyNodeDelete = topologyNodeApi.delete;
const topologyEdgeApi = createCrudApi({ module: 'distribution', resource: 'topologyEdge' });
export const topologyEdgeList = topologyEdgeApi.list;
export const topologyEdgeSave = topologyEdgeApi.save;
export const topologyEdgeDelete = topologyEdgeApi.delete;

// ====== 1.6 数据评估 ======

const completenessApi = createCrudApi({ module: 'evaluation', resource: 'dataCompleteness' });
export const completenessList = completenessApi.list;
export const completenessInfo = completenessApi.info;
export const completenessSave = completenessApi.save;
export const completenessUpdate = completenessApi.update;
export const completenessDelete = completenessApi.delete;

const qualityApi = createCrudApi({ module: 'evaluation', resource: 'dataQuality' });
export const qualityList = qualityApi.list;
export const qualityInfo = qualityApi.info;
export const qualitySave = qualityApi.save;
export const qualityUpdate = qualityApi.update;
export const qualityDelete = qualityApi.delete;

const powerCurveApi = createCrudApi({ module: 'evaluation', resource: 'powerCurve' });
export const powerCurveList = powerCurveApi.list;
export const powerCurveSave = powerCurveApi.save;
export const powerCurveUpdate = powerCurveApi.update;
export const powerCurveDelete = powerCurveApi.delete;

/** 功率曲线分析（T11：异常点剔除 + 负载率模拟） */
export const analyzePowerCurve = (data: Record<string, any>) =>
  request.post('/czBalance/resource/evaluation/powerCurve/analyze', data);

const powerThresholdApi = createCrudApi({ module: 'evaluation', resource: 'powerThreshold' });
export const thresholdList = powerThresholdApi.list;
export const thresholdSave = powerThresholdApi.save;
export const thresholdUpdate = powerThresholdApi.update;
export const thresholdDelete = powerThresholdApi.delete;

const powerBoundaryApi = createCrudApi({ module: 'evaluation', resource: 'powerBoundary' });
export const boundaryList = powerBoundaryApi.list;
export const boundarySave = powerBoundaryApi.save;
export const boundaryUpdate = powerBoundaryApi.update;
export const boundaryDelete = powerBoundaryApi.delete;

// ====== 1.7 数据校验 ======

const consistencyRuleApi = createCrudApi({ module: 'validation', resource: 'consistencyRule' });
export const consistencyRuleList = consistencyRuleApi.list;
export const consistencyRuleSave = consistencyRuleApi.save;
export const consistencyRuleUpdate = consistencyRuleApi.update;
export const consistencyRuleDelete = consistencyRuleApi.delete;

const consistencyResultApi = createCrudApi({ module: 'validation', resource: 'consistencyResult' });
export const consistencyResultList = consistencyResultApi.list;

const integrityApi = createCrudApi({ module: 'validation', resource: 'dataIntegrity' });
export const integrityList = integrityApi.list;
export const integritySave = integrityApi.save;
export const integrityUpdate = integrityApi.update;
export const integrityDelete = integrityApi.delete;

const statisticsApi = createCrudApi({
  module: 'validation',
  resource: 'dataStatistics',
  extra: {
    generate: { method: 'post', path: '/czBalance/resource/validation/dataStatistics/generate' },
  },
});
export const statisticsList = statisticsApi.list;
export const statisticsSave = statisticsApi.save;
export const statisticsUpdate = statisticsApi.update;
export const statisticsDelete = statisticsApi.delete;
export const statisticsGenerate = statisticsApi.generate;

const updateLogApi = createCrudApi({
  module: 'validation',
  resource: 'dataUpdateLog',
  extra: {
    changeHistory: { method: 'get', path: '/czBalance/resource/validation/dataUpdateLog/changeHistory' },
    changeStats: { method: 'get', path: '/czBalance/resource/validation/dataUpdateLog/changeStats' },
  },
});
export const updateLogList = updateLogApi.list;
export const updateLogSave = updateLogApi.save;
export const updateLogDelete = updateLogApi.delete;
export const updateLogChangeHistory = updateLogApi.changeHistory;
export const updateLogChangeStats = updateLogApi.changeStats;

// ====== 1.9 规则化校验 ======

const ruleConfigApi = createCrudApi({ module: 'rule', resource: 'ruleConfig' });
export const ruleConfigList = ruleConfigApi.list;
export const ruleConfigInfo = ruleConfigApi.info;
export const ruleConfigSave = ruleConfigApi.save;
export const ruleConfigUpdate = ruleConfigApi.update;
export const ruleConfigDelete = ruleConfigApi.delete;

const cleanResultApi = createCrudApi({
  module: 'rule',
  resource: 'cleanResult',
});
export const cleanResultList = cleanResultApi.list;
export const cleanResultSave = cleanResultApi.save;
export const cleanResultDelete = cleanResultApi.delete;

const convertResultApi = createCrudApi({
  module: 'rule',
  resource: 'convertResult',
});
export const convertResultList = convertResultApi.list;
export const convertResultSave = convertResultApi.save;
export const convertResultDelete = convertResultApi.delete;

const schemeApi = createCrudApi({ module: 'rule', resource: 'scheme' });
export const schemeList = schemeApi.list;
export const schemeInfo = schemeApi.info;
export const schemeSave = schemeApi.save;
export const schemeUpdate = schemeApi.update;
export const schemeDelete = schemeApi.delete;

// ====== 分区平衡计算 ======

export const calculateBalance = (data: Record<string, any>) =>
  request.post('/czBalance/resource/area/calculateBalance', data);
export const calculateDailyBalance = (data: Record<string, any>) =>
  request.post('/czBalance/resource/area/calculateDailyBalance', data);
export const generateBalanceReport = (data: Record<string, any>) =>
  request.post('/czBalance/resource/area/generateReport', data);

// ====== 业务逻辑接口 ======

export const calculateCompleteness = (data: Record<string, any>) =>
  request.post('/czBalance/resource/evaluation/dataCompleteness/calculate', data);
export const scanCompleteness = () =>
  request.post('/czBalance/resource/evaluation/scanCompleteness');
/** 完整率趋势（T8） */
export const completenessTrend = (targetTable: string, limit?: number) =>
  request.get('/czBalance/resource/evaluation/completenessTrend', { params: { targetTable, limit } });
export const scanQuality = () =>
  request.post('/czBalance/resource/evaluation/scanQuality');
export const generateQualityReport = (data: Record<string, any>) =>
  request.post('/czBalance/resource/evaluation/dataQuality/generate', data);
export const checkThreshold = (params?: Record<string, any>) =>
  request.get('/czBalance/resource/evaluation/powerThreshold/check', { params });
export const executeConsistencyCheck = (params?: Record<string, any>) =>
  request.post('/czBalance/resource/validation/dataConsistency/execute', null, { params });
export const checkConsistency = () =>
  request.post('/czBalance/resource/validation/checkConsistency');
export const executeClean = () =>
  request.post('/czBalance/resource/validation/executeClean');
export const executeConvert = () =>
  request.post('/czBalance/resource/validation/executeConvert');
export const executeRules = (params?: Record<string, any>) =>
  request.get('/czBalance/resource/rule/ruleConfig/execute', { params });

// ====== B-class Enhancement APIs (batch 1-3) ======

export const checkDataCenterAvailability = () =>
  request.post('/czBalance/resource/datacenter/checkAvailability');

// ====== 数据中台同步接口(后端真实接入 OMS/NewGeneration/NariSection/CloudCurve) ======

export const syncCoalUnit = (beginDate: string, endDate: string) =>
  request.post(`/czBalance/resource/datacenter/sync/coalUnit?beginDate=${beginDate}&endDate=${endDate}`);
export const syncNewEnergy = (beginDate: string, endDate: string) =>
  request.post(`/czBalance/resource/datacenter/sync/newEnergy?beginDate=${beginDate}&endDate=${endDate}`);
export const syncEnergyStorage = (beginDate: string, endDate: string) =>
  request.post(`/czBalance/resource/datacenter/sync/energyStorage?beginDate=${beginDate}&endDate=${endDate}`);
export const syncSectionInfo = (date: string) =>
  request.post(`/czBalance/resource/datacenter/sync/sectionInfo?date=${date}`);
export const syncSectionLimit = (date: string) =>
  request.post(`/czBalance/resource/datacenter/sync/sectionLimit?date=${date}`);
export const syncLoadCurve = (date: string) =>
  request.post(`/czBalance/resource/datacenter/sync/loadCurve?date=${date}`);
export const syncTieLine = (date: string) =>
  request.post(`/czBalance/resource/datacenter/sync/tieLine?date=${date}`);
export const syncVpp = (date: string) =>
  request.post(`/czBalance/resource/datacenter/sync/vpp?date=${date}`);
export const getVppAccessStats = () =>
  request.get('/czBalance/resource/datacenter/virtualPowerPlant/accessStats');
export const getAvailabilityExceptions = () =>
  request.get('/czBalance/resource/datacenter/availability/exceptions');
export const validateAreaAccess = () =>
  request.post('/czBalance/resource/area/validateAreaAccess');
export const scanPowerCurveCompleteness = () =>
  request.post('/czBalance/resource/evaluation/scanPowerCurveCompleteness');
export const scanPowerCurveQuality = () =>
  request.post('/czBalance/resource/evaluation/scanPowerCurveQuality');
export const aggregatePerformance = (data?: Record<string, any>) =>
  request.post('/czBalance/resource/evaluation/aggregatePerformance', data);
export const aggregateAccuracy = (data?: Record<string, any>) =>
  request.post('/czBalance/resource/evaluation/aggregateAccuracy', data);
export const schemeSetActive = (data: Record<string, any>) =>
  request.post('/czBalance/resource/rule/scheme/setActive', data);
export const schemeSwitchScheme = (data: Record<string, any>) =>
  request.post('/czBalance/resource/rule/scheme/switchScheme', data);
export const schemeActive = (params?: Record<string, any>) =>
  request.get('/czBalance/resource/rule/scheme/active', { params });
export const analyzeNonDispatchPlan = (data?: Record<string, any>) =>
  request.post('/czBalance/resource/area/analyzeNonDispatchPlan', data);
export const analyzeTopology = (data?: Record<string, any>) =>
  request.post('/czBalance/resource/distribution/analyzeTopology', data);
export const manageUserConnections = (data: Record<string, any>) =>
  request.post('/czBalance/resource/distribution/manageUserConnections', data);
export const userConnectionStats = () =>
  request.get('/czBalance/resource/distribution/userConnectionStats');

// ====== 1.3 配电网业务接口 ======

// 1.3② D5200/EMS 配电网数据同步（前置表模式，同步逻辑 TODO 占位，日志已做真）
export const triggerDistributionSync = (syncObject: string = 'all') =>
  request.post('/czBalance/resource/distribution/externalSync/triggerSync', { syncObject });
export const latestDistributionSyncLog = () =>
  request.get('/czBalance/resource/distribution/externalSync/latestLog');
export const distributionSyncLogList = (params?: Record<string, any>) =>
  request.get('/czBalance/resource/distribution/externalSync/list', { params });

export const userAccessStats = () =>
  request.get('/czBalance/resource/distribution/userAccess/stats');
export const analyzeUserAccess = (analysisType: string) =>
  request.post('/czBalance/resource/distribution/userAccess/analyze', { analysisType });
export const applyStdRule = (appliedObject: string = 'all') =>
  request.post('/czBalance/resource/distribution/stdExecute/apply', { appliedObject });
export const checkStdRules = () =>
  request.get('/czBalance/resource/distribution/stdExecute/check');
export const scanDistributionQuality = (assessScope: string = 'all') =>
  request.post('/czBalance/resource/distribution/qualityScan/scan', { assessScope });
export const checkDistributionChannels = (ids: string[]) =>
  request.post('/czBalance/resource/distribution/channelCheck/check', ids);

// ====== B-class Enhancement APIs (batch 4-5: 已迁移到上方 1.1 P0 模块) ======


// 导出工厂对象，供 useCrud 直接消费
export {
  ledgerInfoApi,
  ledgerTemplateApi,
  ledgerMappingApi,
  ledgerBatchApi,
  ledgerFeedbackApi,
  countyEditApi,
  ledgerArchiveApi,
  archiveRemindApi,
  provincialSyncApi,
  apiConfigApi,
  coalUnitApi,
  energyStorageApi,
  newEnergyApi,
  virtualPowerPlantApi,
  microGridApi,
  dataVersionApi,
  apiCallLogApi,
  nonDispatchUnitApi,
  stationContactApi,
  areaInfoApi,
  areaBalanceApi,
  tieLineApi,
  sectionInfoApi,
  sectionLimitApi,
  loadCurveApi,
  balanceReportApi,
  areaDeviceApi,
  distributionNetworkApi,
  feederInfoApi,
  distributionChannelApi,
  distributionStdApi,
  distributionQualityApi,
  userAccessApi,
  completenessApi,
  qualityApi,
  powerCurveApi,
  powerThresholdApi,
  powerBoundaryApi,
  consistencyRuleApi,
  consistencyResultApi,
  integrityApi,
  statisticsApi,
  updateLogApi,
  ruleConfigApi,
  cleanResultApi,
  convertResultApi,
  schemeApi,
};