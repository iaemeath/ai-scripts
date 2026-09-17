<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="mainTab" type="card">
      <!-- Tab1:县调台账(双子tab:县区资源统计/县调信息) -->
      <a-tab-pane key="county" tab="县调台账">
        <a-tabs v-model:activeKey="countySubTab" type="card">
          <a-tab-pane key="stats" tab="县区资源统计">
            <CountyStats />
          </a-tab-pane>
          <a-tab-pane key="maintain" tab="县调信息">
            <CountyMaintenance />
          </a-tab-pane>
        </a-tabs>
      </a-tab-pane>

      <!-- Tab2:常州台账;CR-008: 角标=省调有地调没有 -->
      <a-tab-pane key="changzhou">
        <template #tab>
          <span>常州台账</span>
          <a-badge :count="provincialOnlyBadge" :number-style="{ marginLeft: '6px', backgroundColor: SEMANTIC_COLOR.warning }" :title="'省调有但地调没有的台账数'" />
        </template>
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
            <a-form-item>
              <a-button type="primary" @click="onSearch">查询</a-button>
              <a-button style="margin-left: 8px" @click="onReset">重置</a-button>
            </a-form-item>
          </a-form>

          <!-- 工具栏:上报/归档/同步动作全部收口在本 tab -->
          <div class="toolbar">
            <a-space>
              <a-button type="primary" @click="onAdd">新增台账</a-button>
              <a-button :loading="syncing" @click="onTriggerSync">同步</a-button>
              <a-button type="primary" ghost :disabled="!selectedRowKeys.length" @click="onOpenBatchReport">
                批量上报{{ selectedRowKeys.length ? `(${selectedRowKeys.length})` : '' }}
              </a-button>
            </a-space>
            <span v-if="selectedRowKeys.length" class="toolbar-hint">已选 {{ selectedRowKeys.length }} 条</span>
            <span v-if="hasDraftPinned" class="toolbar-hint">前排行(县调申报处理中)为虚拟草稿,不可勾选上报</span>
          </div>

          <a-table
            :columns="columns"
            :data-source="displayList"
            :pagination="pagination"
            :loading="loading"
            :row-selection="{ selectedRowKeys, onChange: onSelectionChange, getCheckboxProps: disablePinnedCheck }"
            :row-class-name="rowClassName"
            :scroll="{ x: 1300 }"
            row-key="id"
            size="middle"
            @change="onPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'deviceName'">
                <a-tag v-if="record.__pin" :color="pinColor(record.__pin)" class="pin-tag">{{ pinLabel(record.__pin) }}</a-tag>
                <a-tag v-if="record.__newSync" color="blue" class="pin-tag">新同步</a-tag>
                <template v-if="fieldDiffOf(record, 'deviceName')">
                  <del class="old-val">{{ fieldDiffOf(record, 'deviceName').oldVal }}</del>
                  <span> → </span>
                  <b class="new-val">{{ fieldDiffOf(record, 'deviceName').newVal }}</b>
                </template>
                <span v-else>{{ record.deviceName }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'ratedCapacity'">
                <template v-if="fieldDiffOf(record, 'ratedCapacity')">
                  <del class="old-val">{{ fieldDiffOf(record, 'ratedCapacity').oldVal }}</del>
                  <span> → </span>
                  <b class="new-val">{{ fieldDiffOf(record, 'ratedCapacity').newVal }}</b>
                </template>
                <span v-else>{{ record.ratedCapacity }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'stationName'">
                <template v-if="fieldDiffOf(record, 'stationName')">
                  <del class="old-val">{{ fieldDiffOf(record, 'stationName').oldVal }}</del>
                  <span> → </span>
                  <b class="new-val">{{ fieldDiffOf(record, 'stationName').newVal }}</b>
                </template>
                <span v-else>{{ record.stationName }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'deviceType'">
                {{ deviceTypeLabel(record.deviceType) }}
              </template>
              <template v-else-if="column.dataIndex === 'deviceStatus'">
                <a-tag :color="deviceStatusColor(record.deviceStatus)">{{ deviceStatusLabel(record.deviceStatus) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'dataBaseline'">
                <a-tag :color="baselineColor(record.dataBaseline)">{{ baselineShortLabel(record.dataBaseline) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'updateDataDateTime'">
                {{ fmtTime(record.updateDataDateTime) }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <!-- 前排行:县调草稿出确认/驳回;地调待上报可编辑(未收编即可修正)+详情/时间轴 -->
                <template v-if="record.__pin === 'county-edit' || record.__pin === 'county-new'">
                  <a-button type="link" size="small" @click="onApproveDraft(record.__draft)">确认修改</a-button>
                  <a-button type="link" size="small" danger @click="onRejectDraft(record.__draft)">驳回修改</a-button>
                </template>
                <template v-else-if="record.__pin === 'prov-missing'">
                  <a-button type="link" size="small" @click="onEditNewSync(record)">编辑</a-button>
                  <a-button type="link" size="small" @click="onDetail(record)">详情</a-button>
                  <a-button type="link" size="small" @click="onShowTimeline(record)">时间轴</a-button>
                </template>
                <template v-else>
                  <a-button type="link" size="small" @click="onDetail(record)">详情</a-button>
                  <a-button type="link" size="small" @click="onEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" @click="onShowTimeline(record)">时间轴</a-button>
                  <a-button type="link" size="small" danger @click="onDeleteOne(record)">删除</a-button>
                </template>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- Tab3:省调台账(只读;支持手动同步,新同步机组前排显示) -->
      <a-tab-pane key="provincial" tab="省调台账">
        <div class="tab-inner">
          <a-form layout="inline" class="filter-form">
            <a-form-item label="设备名称">
              <a-input v-model:value="provQuery.name" placeholder="模糊查询" allow-clear style="width: 160px" />
            </a-form-item>
            <a-form-item label="厂站">
              <a-input v-model:value="provQuery.stationName" placeholder="模糊查询" allow-clear style="width: 160px" />
            </a-form-item>
            <a-form-item label="机组类型">
              <a-select v-model:value="provQuery.gnType" placeholder="全部" allow-clear style="width: 140px" :options="provGnTypeOptions" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="onProvSearch">查询</a-button>
              <a-button style="margin-left: 8px" @click="onProvReset">重置</a-button>
            </a-form-item>
          </a-form>
          <div class="toolbar">
            <a-space>
              <a-button type="primary" :loading="provSyncing" @click="onProvSync">同步</a-button>
            </a-space>
            <span class="toolbar-hint">从省调侧同步最新机组快照,新同步到的机组在前排显示</span>
          </div>
          <a-alert message="省调台账为省调侧数据快照,只读不可编辑;同步到地调请在常州台账 tab 操作" type="info" show-icon style="margin-bottom: 12px" />
          <a-table
            :columns="provColumns"
            :data-source="provDisplayList"
            :pagination="provPagination"
            :loading="provLoading"
            :row-class-name="provRowClassName"
            :scroll="{ x: 1200 }"
            row-key="id"
            size="middle"
            @change="onProvPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'name'">
                <a-tag v-if="record.__newSync" color="blue" class="pin-tag">新同步</a-tag>
                <span>{{ record.name }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'gnType'">
                <a-tag>{{ provGnTypeLabel(record.gnType) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'sampleTime'">
                {{ fmtTime(record.sampleTime) }}
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 编辑/新增台账弹窗:统一字段静态表单 + 模板特有字段动态区(台账=模板实例) -->
    <a-modal v-model:open="editVisible" :title="editForm.id ? '编辑台账' : '新增台账'" width="860px" @ok="onSubmit" :confirm-loading="submitting">
      <a-form ref="editFormRef" layout="vertical" :model="editForm" :rules="editRules">
        <a-divider orientation="left" style="margin-top: 4px; font-size: 13px">基本信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="台账名称" name="deviceName">
              <a-input v-model:value="editForm.deviceName" placeholder="如:华润常州#1机组" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属厂站" name="stationName">
              <a-input v-model:value="editForm.stationName" placeholder="如:常州电厂" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="设备类型" name="deviceType">
              <a-select v-model:value="editForm.deviceType" :options="deviceTypeOptions" placeholder="请选择" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属县区" name="areaName">
              <a-select v-model:value="editForm.areaName" :options="areaOptions" placeholder="请选择" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="额定容量(MW)" name="ratedCapacity">
              <a-input-number v-model:value="editForm.ratedCapacity" style="width: 100%" :min="0" :step="0.1" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="电压等级(kV)" name="kvnom">
              <a-input-number v-model:value="editForm.kvnom" style="width: 100%" :min="0" :step="0.1" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left" style="font-size: 13px">运行信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="出力上限 Pmax(MW)" name="pmax">
              <a-input-number v-model:value="editForm.pmax" style="width: 100%" :step="0.1" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="出力下限 Pmin(MW)" name="pmin">
              <a-input-number v-model:value="editForm.pmin" style="width: 100%" :step="0.1" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="设备状态" name="deviceStatus">
              <a-select v-model:value="editForm.deviceStatus" :options="deviceStatusOptions" placeholder="请选择" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="运行状态" name="runState">
              <a-input v-model:value="editForm.runState" placeholder="如:并网运行" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="调度关系" name="dispatchRelation">
              <a-select v-model:value="editForm.dispatchRelation" :options="dispatchOptions" placeholder="请选择" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="投运日期" name="commissionDate">
              <a-date-picker v-model:value="editForm.commissionDate" style="width: 100%" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left" style="font-size: 13px">来源与归属</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="数据来源" name="dataBaseline">
              <a-select v-model:value="editForm.dataBaseline" :options="baselineShortOptions" placeholder="请选择" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="关联模板（决定台账字段集）" name="templateId" required>
              <a-select v-model:value="editForm.templateId" :options="tplOptions" :field-names="{ label: 'templateName', value: 'id' }" placeholder="请选择模板" allow-clear @change="onTemplateChange" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="制造厂家" name="manufacturer">
              <a-input v-model:value="editForm.manufacturer" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="设备型号" name="modelNo">
              <a-input v-model:value="editForm.modelNo" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" name="remark">
              <a-textarea v-model:value="editForm.remark" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 模板特有字段动态区:fieldDefinition 中非宽表列字段,值存 EXTRA_DATA -->
        <template v-if="extraFields.length">
          <a-divider orientation="left" style="font-size: 13px">模板特有字段（{{ editForm.templateId ? tplMap[editForm.templateId]?.templateName : '' }}）</a-divider>
          <a-row :gutter="16">
            <a-col v-for="f in extraFields" :key="f.name" :span="8">
              <a-form-item :label="f.desc || f.name" :name="f.name" :required="!!f.required">
                <a-input-number v-if="f.type === 'NUMBER'" v-model:value="extraForm[f.name]" style="width: 100%" :step="0.1" />
                <a-date-picker v-else-if="f.type === 'DATE'" v-model:value="extraForm[f.name]" style="width: 100%" value-format="YYYY-MM-DD" />
                <a-switch v-else-if="f.type === 'BOOLEAN'" v-model:checked="extraForm[f.name]" />
                <a-input v-else v-model:value="extraForm[f.name]" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </template>
      </a-form>
    </a-modal>

    <!-- 台账详情抽屉:全字段只读展示 -->
    <a-drawer v-model:open="detailVisible" :title="`台账详情 - ${detailRecord?.deviceName || ''}`" width="640px">
      <a-descriptions v-if="detailRecord" :column="2" bordered size="small">
        <a-descriptions-item label="台账名称" :span="2">{{ detailRecord.deviceName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="所属厂站">{{ detailRecord.stationName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="所属县区">{{ detailRecord.areaName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="设备类型">{{ deviceTypeLabel(detailRecord.deviceType) }}</a-descriptions-item>
        <a-descriptions-item label="额定容量(MW)">{{ detailRecord.ratedCapacity ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="电压等级(kV)">{{ detailRecord.kvnom ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="调度关系">{{ detailRecord.dispatchRelation || '-' }}</a-descriptions-item>
        <a-descriptions-item label="出力上限(MW)">{{ detailRecord.pmax ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="出力下限(MW)">{{ detailRecord.pmin ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="设备状态">{{ deviceStatusLabel(detailRecord.deviceStatus) }}</a-descriptions-item>
        <a-descriptions-item label="运行状态">{{ detailRecord.runState || '-' }}</a-descriptions-item>
        <a-descriptions-item label="制造厂家">{{ detailRecord.manufacturer || '-' }}</a-descriptions-item>
        <a-descriptions-item label="设备型号">{{ detailRecord.modelNo || '-' }}</a-descriptions-item>
        <a-descriptions-item label="投运日期">{{ detailRecord.commissionDate || '-' }}</a-descriptions-item>
        <a-descriptions-item label="EMS 编号">{{ detailRecord.emsId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="数据来源">
          <a-tag :color="baselineColor(detailRecord.dataBaseline)">{{ baselineShortLabel(detailRecord.dataBaseline) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="台账模板">{{ tplNameOf(detailRecord.templateId) || '-' }}</a-descriptions-item>
        <a-descriptions-item label="同步时间">{{ fmtTime(detailRecord.syncTime) }}</a-descriptions-item>
        <a-descriptions-item label="同步来源">{{ getSyncSourceLabel(detailRecord.syncSource) }}</a-descriptions-item>
        <a-descriptions-item label="最后更新">{{ fmtTime(detailRecord.updateDataDateTime) }}</a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">{{ detailRecord.remark || '-' }}</a-descriptions-item>
        <!-- 模板特有字段(EXTRA_DATA):按所挂模板 fieldDefinition 展示 -->
        <a-descriptions-item v-for="f in detailExtraFields" :key="f.name" :label="f.desc || f.name">
          {{ detailExtraValues[f.name] ?? '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>

    <!-- CR-004 批量上报弹窗:勾选台账直接建批次上报(不需要模板/目标) -->
    <a-modal v-model:open="batchReportVisible" title="批量上报" width="520px" @ok="onBatchReport" :confirm-loading="batchReporting">
      <a-alert :message="`将为勾选的 ${selectedRowKeys.length} 条台账创建上报批次并立即执行,审核结果可在上报记录页查看`" type="info" show-icon style="margin-bottom: 12px" />
      <div>
        <a-tag v-for="name in selectedNames" :key="name" style="margin-bottom: 4px">{{ name }}</a-tag>
      </div>
    </a-modal>

    <!-- 县调申报审核:确认修改/驳回修改(修改类显示字段级变更对照;新增类显示申报内容清单;意见计入归档留痕) -->
    <a-modal v-model:open="reviewVisible" :title="reviewAction === 'approve' ? '确认修改' : '驳回修改'" width="620px" @ok="onSubmitReview" :confirm-loading="reviewSubmitting">
      <a-alert :message="`申报对象:${reviewDraft?.deviceName || '-'} ｜ 申报人:${reviewDraft?.editBy || '-'} ｜ ${reviewDraft?.editTime || ''}`" type="info" show-icon style="margin-bottom: 12px" />
      <!-- 修改类:字段级变更对照 -->
      <template v-if="reviewDraft?.targetLedgerId">
        <div class="review-section-title">变更对照</div>
        <a-table :columns="reviewDiffColumns" :data-source="reviewDiffs" :pagination="false" row-key="label" size="small" bordered style="margin-bottom: 12px" />
      </template>
      <!-- 新增类:申报内容清单 -->
      <template v-else>
        <div class="review-section-title">申报内容(新增台账)</div>
        <a-descriptions :column="2" bordered size="small" style="margin-bottom: 12px">
          <a-descriptions-item v-for="item in reviewDiffs" :key="item.label" :label="item.label">{{ item.newVal }}</a-descriptions-item>
        </a-descriptions>
      </template>
      <a-form layout="vertical">
        <a-form-item label="审核意见(选填,将计入归档留痕)">
          <a-textarea v-model:value="reviewOpinion" :rows="3"
                      :placeholder="reviewAction === 'approve' ? '如:变更内容与县调上报一致,同意' : '如:容量数据与省调侧不一致,请核实后再报'" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- CR-012 数据时间轴抽屉:县调提交→地调审批→地调上报→省调同步 -->
    <a-drawer v-model:open="timelineVisible" :title="`数据时间轴 - ${timelineLedgerName || ''}`" width="560px">
      <a-spin :spinning="timelineLoading">
        <a-timeline v-if="timelineItems.length" style="margin-top: 8px">
          <a-timeline-item v-for="(item, idx) in timelineItems" :key="idx" :color="item.color">
            <div class="tl-title">{{ item.title }}</div>
            <div v-if="item.desc" class="tl-desc">{{ item.desc }}</div>
            <div class="tl-time">{{ item.time }}</div>
          </a-timeline-item>
        </a-timeline>
        <a-empty v-else description="暂无流转记录" />
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';
import {
  ledgerInfoList, ledgerInfoInfo, ledgerInfoSave, ledgerInfoUpdate, ledgerInfoDelete,
  ledgerTemplateList, ledgerTimeline, compareWithProvincial, scanNewLedger,
  provincialSyncTrigger, provincialUnitList, provincialUnitSyncTrigger, areaInfoList,
  countyEditList, ledgerArchiveApprove, ledgerArchiveReject,
  ledgerBatchCreate, ledgerBatchExecute,
} from '../../common/v2/mock/gateway';
import { SEMANTIC_COLOR, getDeviceStatusTagColor, LEDGER_COLUMN_CN } from '../../common/v2/constants/ledger';
import { fmtTime } from '../../common/v2/utils/datetime';
import { currentUser } from '../../common/v2/utils/user';
import {
  DEVICE_TYPE_OPTIONS, DEVICE_STATUS_OPTIONS,
  getDeviceStatusLabel as getDevStatusLabel,
  getSyncSourceLabel,
} from '../../common/v2/constants/ledger';
import CountyStats from '../../common/v2/panel/CountyStats.vue';
import CountyMaintenance from '../../common/v2/panel/CountyMaintenance.vue';

const mainTab = ref('changzhou');
const router = useRouter();
const reviewerName = () => currentUser();
const countySubTab = ref('maintain');

const query = reactive({
  dataBaseline: undefined as string | undefined,
  deviceType: undefined as string | undefined,
  deviceName: '',
  stationName: '',
  deviceStatus: undefined as string | undefined,
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
  { title: '设备名称', dataIndex: 'deviceName', width: 230, ellipsis: true },
  { title: '厂站', dataIndex: 'stationName', width: 140, ellipsis: true },
  { title: '区域', dataIndex: 'areaName', width: 90 },
  { title: '容量(MW)', dataIndex: 'ratedCapacity', width: 95, align: 'right' },
  { title: '数据来源', dataIndex: 'dataBaseline', width: 95 },
  { title: '最后更新', dataIndex: 'updateDataDateTime', width: 150 },
  { title: '操作', dataIndex: 'action', width: 240, fixed: 'right' },
];

const deviceTypeOptions = DEVICE_TYPE_OPTIONS;
function deviceTypeLabel(v: string) { return DEVICE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? (v || '-'); }

const deviceStatusOptions = DEVICE_STATUS_OPTIONS;
function deviceStatusLabel(v: string) { return getDevStatusLabel(v); }
// CL-2a:正常态不着色,单一实现见 constants/getDeviceStatusTagColor
function deviceStatusColor(v: string) { return getDeviceStatusTagColor(v); }

// CL-2b:数据来源是分类维度不是状态,不着语义色(避免 green/orange 暗示好坏)
function baselineColor(_v: string) { return 'default'; }
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
const dispatchOptions = ['省调调度', '地调调度', '县调调度'].map((v) => ({ label: v, value: v }));

/** 本次点击同步的时刻:同步落库的行(syncTime 晚于它)在列表中打"新同步"高亮 */
const syncMarkTs = ref(0);

async function loadData() {
  loading.value = true;
  try {
    const res: any = await ledgerInfoList(query);
    const data = res?.data ?? {};
    const rows: any[] = data.list ?? [];
    // 同步后新落库的行打标(淡绿底色),标识跨页保持
    if (syncMarkTs.value > 0) {
      for (const r of rows) {
        (r as any).__newSync = !!(r.syncTime && dayjs(r.syncTime).valueOf() >= syncMarkTs.value);
      }
    }
    list.value = rows;
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
    deviceStatus: undefined, pageNum: 1,
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

// ===== CR-008 角标:省调有但地调没有的数量 =====
const provincialOnlyBadge = ref(0);
async function loadProvincialBadge() {
  try {
    const res: any = await compareWithProvincial();
    const d = res?.data ?? {};
    provincialOnlyBadge.value = Number(d.provincialOnlyCount ?? 0) || 0;
  } catch {
    provincialOnlyBadge.value = 0;
  }
}

// ===== CR-009/019 差异前排:县调待审变更 + 地调待上报,以置顶行插入列表第 1 页前 =====
const countyDraftList = ref<any[]>([]);
const newLedgerList = ref<any[]>([]);
/** 全量台账索引(草稿差异对比的原值来源,不依赖目标台账是否在当前分页) */
const ledgerIndex = reactive<Record<string, any>>({});

async function loadLedgerIndex() {
  try {
    const res: any = await ledgerInfoList({ pageNum: 1, pageSize: 999 });
    for (const l of (res?.data?.list ?? [])) ledgerIndex[l.id] = l;
  } catch { /* 索引失败不阻塞 */ }
}

async function refreshTopZone() {
  try {
    const [draftRes, newRes]: any = await Promise.all([
      countyEditList({ status: 'PENDING', pageNum: 1, pageSize: 50 }),
      scanNewLedger(),
    ]);
    countyDraftList.value = draftRes?.data?.list ?? [];
    newLedgerList.value = newRes?.data?.list ?? [];
    loadLedgerIndex();
  } catch (e: any) {
    console.error('差异前排数据加载失败', e);
  }
}

function parseDraftPayload(d: any): Record<string, any> {
  try {
    return typeof d.payload === 'string' ? JSON.parse(d.payload || '{}') : (d.payload || {});
  } catch {
    return {};
  }
}

/** 县调修改草稿的字段级差异:payload(新值) vs 台账当前值(旧值) */
function draftDiffs(d: any): { field: string; oldVal: any; newVal: any }[] {
  const diffs: { field: string; oldVal: any; newVal: any }[] = [];
  const payload = parseDraftPayload(d);
  const row = ledgerIndex[d.targetLedgerId] || {};
  for (const k of Object.keys(payload)) {
    const nv = payload[k];
    const ov = (row as any)[k];
    if (ov !== undefined && String(ov) !== String(nv) && nv !== null && nv !== '') {
      diffs.push({ field: k, oldVal: ov, newVal: nv });
    }
  }
  return diffs;
}

/** 前排置顶行:县调修改(原值删除线+新值)/县调新增/地调待上报 */
const pinnedRows = computed(() => {
  const rows: any[] = [];
  for (const d of countyDraftList.value) {
    const payload = parseDraftPayload(d);
    if (d.targetLedgerId) {
      const base = ledgerIndex[d.targetLedgerId] || {};
      rows.push({
        ...base,
        id: 'draft-' + d.id,
        __pin: 'county-edit',
        __draft: d,
        __diffs: draftDiffs(d),
        deviceName: payload.deviceName || base.deviceName || d.deviceName,
        updateDataDateTime: d.updateDataDateTime || d.editTime,
      });
    } else {
      rows.push({
        id: 'draft-' + d.id,
        __pin: 'county-new',
        __draft: d,
        deviceName: payload.deviceName || '(未命名)',
        stationName: payload.stationName,
        areaName: payload.areaName,
        ratedCapacity: payload.ratedCapacity,
        updateDataDateTime: d.updateDataDateTime || d.editTime,
      });
    }
  }
  for (const l of newLedgerList.value) {
    rows.push({ ...l, __pin: 'prov-missing' });
  }
  return rows;
});

/** 每页列表 = 差异前排(全部展开,跨页常驻) + 当前分页数据(前排已有的真实台账行去重,避免行 key 重复) */
const displayList = computed(() => {
  const pinnedIds = new Set(pinnedRows.value.filter((r) => !String(r.id).startsWith('draft-')).map((r) => r.id));
  return [...pinnedRows.value, ...list.value.filter((l) => !pinnedIds.has(l.id))];
});

/** 存在县调申报前排行时,提示其勾选列禁用原因 */
const hasDraftPinned = computed(() =>
  pinnedRows.value.some((r) => r.__pin === 'county-edit' || r.__pin === 'county-new'),
);

function rowClassName(record: any) {
  // 四类置顶/标识行各配一种底色,与分类 tag 同色系:修改=琥珀/新增=淡紫/地调待上报=淡蓝/新同步=淡绿
  if (record.__pin === 'county-edit') return 'pin-row pin-county-edit';
  if (record.__pin === 'county-new') return 'pin-row pin-county-new';
  if (record.__pin === 'prov-missing') return 'pin-row pin-prov';
  if (record.__newSync) return 'new-sync-row';
  return '';
}
const PIN_META: Record<string, { label: string; color: string }> = {
  'county-edit': { label: '县调修改', color: 'orange' },
  'county-new': { label: '县调新增', color: 'purple' },
  'prov-missing': { label: '地调待上报', color: 'blue' },
};
function pinLabel(pin: string) { return PIN_META[pin]?.label ?? pin; }
function pinColor(pin: string) { return PIN_META[pin]?.color ?? 'default'; }
/** 勾选列:县调前排行是虚拟草稿行不可勾;地调待上报是真实台账行,可勾选上报 */
function disablePinnedCheck(record: any) {
  return { disabled: record.__pin === 'county-edit' || record.__pin === 'county-new' };
}
/** 指定列的字段差异(前排修改行内联删除线渲染) */
function fieldDiffOf(record: any, field: string) {
  if (!record.__diffs) return null;
  return record.__diffs.find((x: any) => x.field === field) ?? null;
}

/** 确认修改/驳回修改(CR-018):弹窗展示申报变更明细,意见计入归档留痕 */
const reviewVisible = ref(false);
const reviewSubmitting = ref(false);
const reviewAction = ref<'approve' | 'reject'>('approve');
const reviewDraft = ref<any>(null);
const reviewOpinion = ref('');

/** 申报字段中文标签(审核弹窗 diff 表用) */
const FIELD_LABELS: Record<string, string> = {
  deviceName: '台账名称', stationName: '所属厂站', deviceType: '设备类型',
  ratedCapacity: '额定容量(MW)', kvnom: '电压等级(kV)', pmax: '出力上限(MW)', pmin: '出力下限(MW)',
  deviceStatus: '设备状态', runState: '运行状态', dispatchRelation: '调度关系',
  commissionDate: '投运日期', areaName: '所属县区', remark: '备注',
};
function fmtDiffVal(field: string, v: any): string {
  if (v === undefined || v === null || v === '') return '-';
  if (field === 'deviceType') return deviceTypeLabel(String(v));
  if (field === 'deviceStatus') return deviceStatusLabel(v);
  return String(v);
}
const reviewDiffColumns = [
  { title: '字段', dataIndex: 'label', width: 130 },
  { title: '台账当前值', dataIndex: 'oldVal' },
  { title: '申报值', dataIndex: 'newVal' },
];
/** 审核弹窗的变更明细:修改类=字段级 diff;新增类=关键字段清单 */
const reviewDiffs = computed(() => {
  const d = reviewDraft.value;
  if (!d) return [];
  const payload = parseDraftPayload(d);
  const keys = Object.keys(payload).filter((k) => payload[k] !== undefined && payload[k] !== null && payload[k] !== '');
  if (d.targetLedgerId) {
    const row = ledgerIndex[d.targetLedgerId] || {};
    const diffs = keys
      .filter((k) => row[k] === undefined || String(row[k]) !== String(payload[k]))
      .map((k) => ({ label: FIELD_LABELS[k] ?? k, oldVal: fmtDiffVal(k, row[k]), newVal: fmtDiffVal(k, payload[k]) }));
    return diffs.length ? diffs : [{ label: '—', oldVal: '与台账当前值一致', newVal: '—' }];
  }
  return keys
    .filter((k) => FIELD_LABELS[k])
    .map((k) => ({ label: FIELD_LABELS[k] ?? k, oldVal: '—(新增)', newVal: fmtDiffVal(k, payload[k]) }));
});

function onApproveDraft(d: any) {
  reviewAction.value = 'approve';
  reviewDraft.value = d;
  reviewOpinion.value = '';
  reviewVisible.value = true;
}
function onRejectDraft(d: any) {
  reviewAction.value = 'reject';
  reviewDraft.value = d;
  reviewOpinion.value = '';
  reviewVisible.value = true;
}
async function onSubmitReview() {
  reviewSubmitting.value = true;
  try {
    if (reviewAction.value === 'approve') {
      await ledgerArchiveApprove({ draftId: reviewDraft.value.id, reviewer: reviewerName(), opinion: reviewOpinion.value.trim() });
      message.success('已确认修改,归档留痕完成');
    } else {
      await ledgerArchiveReject({ draftId: reviewDraft.value.id, reviewer: reviewerName(), opinion: reviewOpinion.value.trim() });
      message.success('已驳回修改,台账保持原状');
    }
    reviewVisible.value = false;
    refreshTopZone();
    loadData();
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  } finally {
    reviewSubmitting.value = false;
  }
}

// ===== CR-003 同步按钮:点击后把省调数据同步到地调,新落库行打"新同步"高亮 =====
const syncing = ref(false);
function onTriggerSync() {
  Modal.confirm({
    title: '触发省调同步?',
    content: '将省调侧最新台账数据同步到地调,新同步到的记录会以淡绿底色标识',
    onOk: async () => {
      syncing.value = true;
      syncMarkTs.value = Date.now();
      try {
        await provincialSyncTrigger({});
        message.success('同步完成,新同步到的记录已淡绿高亮,可直接勾选批量上报');
        await loadData();
        loadProvincialBadge();
        refreshTopZone();
      } catch (e: any) {
        message.error(e?.message || '触发失败');
      } finally {
        syncing.value = false;
      }
    },
  });
}

// ===== CR-004 批量上报:勾选台账建批次并执行 =====
const selectedRowKeys = ref<string[]>([]);
function onSelectionChange(keys: string[]) {
  selectedRowKeys.value = keys;
}

const batchReportVisible = ref(false);
const batchReporting = ref(false);
/** 勾选行名称(含金底"地调待上报"行),弹窗内展示 */
const selectedNames = computed(() => {
  const pool = [...list.value, ...newLedgerList.value];
  return selectedRowKeys.value
    .map((id) => pool.find((l) => l.id === id)?.deviceName ?? id);
});

function onOpenBatchReport() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选要上报的台账');
    return;
  }
  batchReportVisible.value = true;
}

async function onBatchReport() {
  batchReporting.value = true;
  try {
    // 不需要模板/目标:按每条台账自身模板组装
    const createRes: any = await ledgerBatchCreate({
      ledgerIds: selectedRowKeys.value,
    });
    const batch = createRes?.data ?? {};
    const batchId = batch.batchId || batch.id;
    if (batchId) {
      const execRes: any = await ledgerBatchExecute({ batchId });
      const d = execRes?.data ?? {};
      Modal.success({
        title: '批量上报完成',
        content: `批次 ${batch.batchNo || ''} 上报完成:成功 ${d.successCount ?? 0} / 失败 ${d.failCount ?? 0}`,
        okText: '查看上报批次',
        onOk: () => router.push('/resource/ledger/ledgerReport'),
      });
    } else {
      message.success('批次已创建,请到上报记录页查看');
    }
    batchReportVisible.value = false;
    selectedRowKeys.value = [];
  } catch (e: any) {
    message.error(e?.message || '批量上报失败');
  } finally {
    batchReporting.value = false;
  }
}

// 归档说明:归档=地调审核(确认/驳回)动作的留痕,入口在前排行「确认修改/驳回修改」,不设独立批量归档动作

// ===== CR-012 数据时间轴 =====
const timelineVisible = ref(false);
const timelineLoading = ref(false);
const timelineLedgerName = ref('');
const timelineData = ref<any>(null);

/** 时间轴固定五段语义:县调提交 → 地调确认/驳回(归档) → 地调上报 → 省调专业审核 → 省调同步 */
const timelineItems = computed(() => {
  const d = timelineData.value;
  if (!d) return [];
  type Node = { time: any; title: string; desc: string; color: string; ts: number };
  const nodes: Node[] = [];
  // ① 县调提交(每次申报一条;驳回后再报会出现多条)
  for (const c of d.countyEdits ?? []) {
    nodes.push({
      time: fmtTime(c.editTime), title: '县调提交',
      desc: `编辑人:${c.editBy || '-'} · 类型:${c.targetLedgerId ? '修改台账' : '新增台账'}`,
      color: 'blue', ts: c.editTime ? dayjs(c.editTime).valueOf() : 0,
    });
  }
  // ② 地调确认/驳回(归档留痕)
  for (const a of d.archives ?? []) {
    const approved = String(a.reviewStatus ?? '') === 'APPROVED';
    nodes.push({
      time: fmtTime(a.reviewTime), title: approved ? '地调确认(归档)' : '地调驳回',
      desc: `审核人:${a.reviewer || '-'}${a.reviewOpinion ? ' · 意见:' + a.reviewOpinion : ''}`,
      color: approved ? 'green' : 'red', ts: a.reviewTime ? dayjs(a.reviewTime).valueOf() : 0,
    });
  }
  // ③ 地调上报省调
  for (const r of d.reports ?? []) {
    nodes.push({
      time: fmtTime(r.reportTime), title: `地调上报省调${r.batchNo ? `(批次 ${r.batchNo})` : ''}`,
      desc: r.responseMsg || '', color: 'cyan',
      ts: r.reportTime ? dayjs(r.reportTime).valueOf() : 0,
    });
    // ④ 省调专业审核结果
    if (r.reviewTime && (r.reviewStatus === 'APPROVED' || r.reviewStatus === 'REJECTED')) {
      nodes.push({
        time: fmtTime(r.reviewTime), title: `省调专业审核${r.reviewStatus === 'APPROVED' ? '通过' : '未通过'}`,
        desc: r.responseMsg || '', color: r.reviewStatus === 'APPROVED' ? 'green' : 'red',
        ts: dayjs(r.reviewTime).valueOf(),
      });
    }
  }
  // ⑤ 省调同步
  if (d.sync?.syncTime) {
    nodes.push({
      time: fmtTime(d.sync.syncTime), title: '省调同步',
      desc: `同步来源:${d.sync.syncSource || '-'}`, color: 'gray',
      ts: dayjs(d.sync.syncTime).valueOf(),
    });
  }
  return nodes.filter((n) => n.ts > 0).sort((a, b) => b.ts - a.ts);
});

function onShowTimeline(record: any) {
  timelineLedgerName.value = record.deviceName || record.id;
  timelineData.value = null;
  timelineVisible.value = true;
  timelineLoading.value = true;
  ledgerTimeline(record.id)
    .then((res: any) => { timelineData.value = res?.data ?? null; })
    .catch((e: any) => { message.error(e?.message || '时间轴加载失败'); timelineVisible.value = false; })
    .finally(() => { timelineLoading.value = false; });
}

// ===== CR-002 省调台账(只读) =====
const provQuery = reactive({ name: '', stationName: '', gnType: undefined as string | undefined, pageNum: 1, pageSize: 10 });
const provList = ref<any[]>([]);
const provLoading = ref(false);
const provPagination = ref({
  current: 1, pageSize: 10, total: 0, showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
});
const provColumns = [
  { title: '设备名称', dataIndex: 'name', width: 170, ellipsis: true },
  { title: '厂站', dataIndex: 'stationName', width: 150, ellipsis: true },
  { title: '机组类型', dataIndex: 'gnType', width: 110 },
  { title: '区域', dataIndex: 'areaName', width: 100 },
  { title: 'P max(MW)', dataIndex: 'pmax', width: 100, align: 'right' },
  { title: 'P min(MW)', dataIndex: 'pmin', width: 100, align: 'right' },
  { title: '额定容量(MW)', dataIndex: 'mvarate', width: 110, align: 'right' },
  { title: '运行状态', dataIndex: 'runState', width: 95 },
  { title: '采样时间', dataIndex: 'sampleTime', width: 150 },
];
const PROV_GN_TYPE: Record<string, string> = {
  thermal: '火电', hydro: '水电', pumped_storage: '抽蓄', nuclear: '核电', gas: '燃气',
  biomass: '生物质', wind: '风电', solar: '光伏', storage: '储能',
};
const provGnTypeOptions = Object.entries(PROV_GN_TYPE).map(([value, label]) => ({ value, label }));
function provGnTypeLabel(v: string) { return PROV_GN_TYPE[String(v)] || v || '-'; }

async function loadProvincial() {
  provLoading.value = true;
  try {
    const res: any = await provincialUnitList({ ...provQuery });
    const rows: any[] = res?.data?.list ?? [];
    // 本次同步时刻之后采样落库的机组打"新同步"标(前排显示)
    if (provSyncMarkTs.value > 0) {
      for (const r of rows) {
        (r as any).__newSync = !!(r.sampleTime && dayjs(r.sampleTime).valueOf() >= provSyncMarkTs.value);
      }
    }
    provList.value = rows;
    provPagination.value.total = res?.data?.total ?? 0;
    provPagination.value.current = provQuery.pageNum;
  } catch (e: any) {
    message.error(e?.message || '省调台账查询失败');
  } finally {
    provLoading.value = false;
  }
}

// ===== 省调侧手动同步:新同步机组前排显示 =====
const provSyncing = ref(false);
const provSyncMarkTs = ref(0);

async function onProvSync() {
  provSyncing.value = true;
  provSyncMarkTs.value = Date.now();
  try {
    const res: any = await provincialUnitSyncTrigger();
    const d = res?.data ?? {};
    if ((d.newCount ?? 0) > 0) {
      message.success(`同步完成,新增 ${d.newCount} 台机组:${(d.addedNames ?? []).join('、')},已在前排显示`);
    } else {
      message.success('同步完成,省调侧暂无新增机组');
    }
    provQuery.pageNum = 1;
    await loadProvincial();
  } catch (e: any) {
    message.error(e?.message || '同步失败');
  } finally {
    provSyncing.value = false;
  }
}

/** 省调台账第 1 页 = 新同步前排 + 其余;新同步行去重后不再出现在正常列表 */
const provDisplayList = computed(() => {
  if (provQuery.pageNum !== 1) return provList.value;
  const pinned = provList.value.filter((r) => (r as any).__newSync);
  if (!pinned.length) return provList.value;
  const pinnedIds = new Set(pinned.map((r) => r.id));
  return [...pinned, ...provList.value.filter((r) => !pinnedIds.has(r.id))];
});

function provRowClassName(record: any) {
  return record.__newSync ? 'new-sync-row' : '';
}
function onProvSearch() { provQuery.pageNum = 1; loadProvincial(); }
function onProvReset() {
  Object.assign(provQuery, { name: '', stationName: '', gnType: undefined, pageNum: 1 });
  loadProvincial();
}
function onProvPageChange(p: any) {
  provQuery.pageNum = p.current;
  provQuery.pageSize = p.pageSize;
  provPagination.value.current = p.current;
  provPagination.value.pageSize = p.pageSize;
  loadProvincial();
}

// ===== 台账编辑/新增(全字段静态表单) =====
const editVisible = ref(false);
const submitting = ref(false);
const editForm = reactive<any>({});
const editFormRef = ref();
const editRules = {
  deviceName: [{ required: true, message: '请填写台账名称', trigger: 'blur' }],
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  templateId: [{ required: true, message: '请选择关联模板', trigger: 'change' }],
};

// ===== 模板特有字段动态区(台账=模板实例):fieldDefinition 中非宽表列字段,值存 EXTRA_DATA =====
const extraForm = reactive<Record<string, any>>({});
const extraFields = computed(() => {
  const tpl = editForm.templateId ? tplMap[editForm.templateId] : null;
  const fields = parseTplFields(tpl?.fieldDefinition);
  return fields.filter((f: any) => f.name && !LEDGER_COLUMN_CN[f.name]);
});
function parseTplFields(json?: string): any[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}
/** 切换模板:重建特有字段表单(先保留同名已填值,减少重复录入) */
function onTemplateChange() {
  const keep = { ...extraForm };
  Object.keys(extraForm).forEach((k) => delete extraForm[k]);
  for (const f of extraFields.value) {
    extraForm[f.name] = keep[f.name] ?? null;
  }
}
function syncExtraFormFrom(record: any) {
  Object.keys(extraForm).forEach((k) => delete extraForm[k]);
  let parsed: any = {};
  if (record.extraData) {
    try { parsed = JSON.parse(record.extraData); } catch { parsed = {}; }
  }
  for (const f of extraFields.value) {
    extraForm[f.name] = parsed[f.name] ?? null;
  }
}

/** 详情抽屉:所挂模板的特有字段定义 + EXTRA_DATA 值 */
const detailExtraFields = computed(() => {
  const tpl = detailRecord.value?.templateId ? tplMap[detailRecord.value.templateId] : null;
  return parseTplFields(tpl?.fieldDefinition).filter((f: any) => f.name && !LEDGER_COLUMN_CN[f.name]);
});
const detailExtraValues = computed<Record<string, any>>(() => {
  if (!detailRecord.value?.extraData) return {};
  try { return JSON.parse(detailRecord.value.extraData); } catch { return {}; }
});

const tplOptions = ref<any[]>([]);
const tplMap = reactive<Record<string, any>>({});
async function loadTplOptions() {
  try {
    const res: any = await ledgerTemplateList({ pageNum: 1, pageSize: 100, enabled: 'Y' });
    const arr = res?.data?.list ?? [];
    tplOptions.value = arr;
    arr.forEach((tpl: any) => { tplMap[tpl.id] = tpl; });
  } catch (e) {
    console.error('加载模板选项失败', e);
  }
}
function tplNameOf(id?: string) {
  if (!id) return '';
  return tplMap[id]?.templateName || '';
}

const areaOptions = ref<{ label: string; value: string }[]>([]);
async function loadAreaOptions() {
  try {
    const res: any = await areaInfoList({});
    areaOptions.value = (res?.data ?? []).map((a: any) => ({ label: a.areaName, value: a.areaName }));
  } catch { /* 县区下拉失败不阻塞 */ }
}

const EMPTY_FORM = () => ({
  id: null, deviceName: '', stationName: '', deviceType: undefined as string | undefined,
  areaName: undefined as string | undefined, ratedCapacity: undefined as number | undefined,
  kvnom: undefined as number | undefined, pmax: undefined as number | undefined,
  pmin: undefined as number | undefined, deviceStatus: undefined as string | undefined,
  runState: '', dispatchRelation: undefined as string | undefined, commissionDate: '',
  dataBaseline: 'LOCAL', templateId: undefined as string | undefined,
  manufacturer: '', modelNo: '', remark: '',
});

function onAdd() {
  Object.assign(editForm, EMPTY_FORM());
  syncExtraFormFrom({});
  editVisible.value = true;
}

/** 地调待上报(省调有地调没有)行「编辑」:该台账地调库还没有,
 *  预填省调数据走新增收编,地调可在收编前修正字段 */
function onEditNewSync(record: any) {
  Object.assign(editForm, EMPTY_FORM(), {
    deviceName: record.deviceName,
    stationName: record.stationName,
    deviceType: record.deviceType,
    areaName: record.areaName,
    ratedCapacity: record.ratedCapacity,
    kvnom: record.kvnom,
    pmax: record.pmax,
    pmin: record.pmin,
    deviceStatus: record.deviceStatus,
    runState: record.runState,
    dispatchRelation: record.dispatchRelation,
    commissionDate: record.commissionDate,
    manufacturer: record.manufacturer,
    modelNo: record.modelNo,
    remark: record.remark,
  });
  syncExtraFormFrom(record);
  editVisible.value = true;
}

function onEdit(record: any) {
  Object.assign(editForm, EMPTY_FORM(), {
    id: record.id,
    deviceName: record.deviceName,
    stationName: record.stationName,
    deviceType: record.deviceType,
    areaName: record.areaName,
    ratedCapacity: record.ratedCapacity,
    kvnom: record.kvnom,
    pmax: record.pmax,
    pmin: record.pmin,
    deviceStatus: record.deviceStatus,
    runState: record.runState,
    dispatchRelation: record.dispatchRelation,
    commissionDate: record.commissionDate,
    dataBaseline: record.dataBaseline,
    templateId: record.templateId,
    manufacturer: record.manufacturer,
    modelNo: record.modelNo,
    remark: record.remark,
  });
  syncExtraFormFrom(record);
  editVisible.value = true;
}

async function onSubmit() {
  try { await editFormRef.value.validate(); } catch { return; }
  // 数值合理性:Pmax ≥ Pmin
  if (editForm.pmax != null && editForm.pmin != null && Number(editForm.pmax) < Number(editForm.pmin)) {
    message.warning('出力上限 Pmax 不能小于出力下限 Pmin');
    return;
  }
  // 模板特有字段必填校验
  for (const f of extraFields.value) {
    if (f.required && (extraForm[f.name] === null || extraForm[f.name] === undefined || extraForm[f.name] === '')) {
      message.warning(`请填写特有字段「${f.desc || f.name}」`);
      return;
    }
  }
  submitting.value = true;
  try {
    const payload: any = { ...editForm };
    if (extraFields.value.length) {
      payload.extraData = JSON.stringify(extraForm);
    }
    if (editForm.id) {
      await ledgerInfoUpdate(payload);
      message.success('已保存');
    } else {
      await ledgerInfoSave(payload);
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

// ===== 台账详情抽屉 =====
const detailVisible = ref(false);
const detailRecord = ref<any>(null);

async function onDetail(record: any) {
  try {
    const res: any = await ledgerInfoInfo(record.id);
    detailRecord.value = res?.data ?? record;
  } catch {
    detailRecord.value = record;
  }
  detailVisible.value = true;
}

onMounted(() => {
  loadData();
  loadTplOptions();
  loadAreaOptions();
  loadProvincialBadge();
  refreshTopZone();
});

// 切到省调台账 tab 时懒加载
watch(mainTab, () => {
  if (mainTab.value === 'provincial' && !provList.value.length) loadProvincial();
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
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  .toolbar-hint {
    color: #999;
    font-size: 12px;
  }
}
/* 分类置顶行底色:与分类 tag 同色系,四态四色便于扫读 */
:deep(.pin-county-edit) > td {
  background: #fffbe6 !important;
}
:deep(.pin-county-new) > td {
  background: #f9f0ff !important;
}
:deep(.pin-prov) > td {
  background: #e6f4ff !important;
}
/* 同步新落库行:淡绿底标识 */
:deep(.new-sync-row) > td {
  background: #f6ffed !important;
}
.pin-tag {
  margin-right: 4px;
}
.review-section-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 13px;
}
.old-val {
  color: #999;
  text-decoration: line-through;
}
.new-val {
  color: #d46b08;
}
.tl-title { font-weight: 500; }
.tl-desc { color: #666; font-size: 12px; margin-top: 2px; }
.tl-time { color: #aaa; font-size: 12px; margin-top: 2px; }
:deep(.ant-table-tbody) {
  font-variant-numeric: tabular-nums;
}
</style>
