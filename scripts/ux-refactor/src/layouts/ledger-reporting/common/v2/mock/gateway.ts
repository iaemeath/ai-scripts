/**
 * 台账模块服务网关（页面唯一 import 入口）
 *
 * 设计迭代期（后端封存）：USE_MOCK = true，页面数据全部走前端 mock（src/mock/ledgerMock.ts）。
 * 前端页面设计定稿后，按 mock 契约同步改造后端接口，再把 USE_MOCK 置 false 即整体切回真实 API，
 * 页面代码零改动。mock 与真实 API 同名同参同返回结构。
 */
import * as mock from './ledgerMock';

// 作品集演示版：纯前端运行，页面数据全部来自前端 mock（src/mock/ledgerMock.ts）
export const USE_MOCK = true;

const impl: Record<string, any> = mock as any;

// ===== 台账信息 =====
export const ledgerInfoList = impl.ledgerInfoList;
export const ledgerInfoInfo = impl.ledgerInfoInfo;
export const ledgerInfoSave = impl.ledgerInfoSave;
export const ledgerInfoUpdate = impl.ledgerInfoUpdate;
export const ledgerInfoDelete = impl.ledgerInfoDelete;
export const ledgerTemplateList = impl.ledgerTemplateList;
export const ledgerTemplateInfo = impl.ledgerTemplateInfo;
export const ledgerTemplateSave = impl.ledgerTemplateSave;
export const ledgerTemplateUpdate = impl.ledgerTemplateUpdate;
export const ledgerTemplateDelete = impl.ledgerTemplateDelete;
export const ledgerTemplateCheckIntegrity = impl.ledgerTemplateCheckIntegrity;
export const ledgerMappingList = impl.ledgerMappingList;
export const ledgerMappingInfo = impl.ledgerMappingInfo;
export const ledgerMappingSave = impl.ledgerMappingSave;
export const ledgerMappingUpdate = impl.ledgerMappingUpdate;
export const ledgerMappingDelete = impl.ledgerMappingDelete;
export const ledgerMappingCountUnmapped = impl.ledgerMappingCountUnmapped;
export const ledgerTimeline = impl.ledgerTimeline;
export const compareWithProvincial = impl.compareWithProvincial;
export const compareSummary = impl.compareSummary;
export const scanNewLedger = impl.scanNewLedger;
export const countyStats = impl.countyStats;

// ===== 省调台账 / 省地同步 =====
export const provincialUnitList = impl.provincialUnitList;
export const provincialUnitSyncTrigger = impl.provincialUnitSyncTrigger;
export const provincialSyncTrigger = impl.provincialSyncTrigger;
export const provincialSyncList = impl.provincialSyncList;
export const provincialSyncDetailList = impl.provincialSyncDetailList;
export const provincialSyncStats = impl.provincialSyncStats;

// ===== 县调申报(简化模型:直接上报→地调确认/驳回) =====
export const countyEditList = impl.countyEditList;
export const countyEditInfo = impl.countyEditInfo;
export const countyEditSaveDraft = impl.countyEditSaveDraft;
export const areaInfoList = impl.areaInfoList;

// ===== 归档 =====
export const ledgerArchiveList = impl.ledgerArchiveList;
export const ledgerArchiveInfo = impl.ledgerArchiveInfo;
export const ledgerArchiveApprove = impl.ledgerArchiveApprove;
export const ledgerArchiveReject = impl.ledgerArchiveReject;
export const ledgerArchiveBatchApprove = impl.ledgerArchiveBatchApprove;
export const ledgerArchiveStats = impl.ledgerArchiveStats;

// ===== 上报批次 =====
export const ledgerBatchList = impl.ledgerBatchList;
export const ledgerBatchCreate = impl.ledgerBatchCreate;
export const ledgerBatchExecute = impl.ledgerBatchExecute;
export const ledgerBatchCancel = impl.ledgerBatchCancel;
export const ledgerBatchDetail = impl.ledgerBatchDetail;
export const ledgerBatchRetryFailed = impl.ledgerBatchRetryFailed;
export const ledgerBatchRetryDetail = impl.ledgerBatchRetryDetail;
export const ledgerBatchRetryDetailBatch = impl.ledgerBatchRetryDetailBatch;
export const ledgerBatchCancelDetail = impl.ledgerBatchCancelDetail;
export const ledgerBatchMockReview = impl.ledgerBatchMockReview;
export const ledgerBatchFailedRecords = impl.ledgerBatchFailedRecords;
export const ledgerBatchRecordStats = impl.ledgerBatchRecordStats;
export const ledgerBatchStats = impl.ledgerBatchStats;
export const ledgerBatchSyncReview = impl.ledgerBatchSyncReview;
export const ledgerBatchExport = impl.ledgerBatchExport;
