<template>
  <div class="app-layout">
    <div class="sidebar">
      <div class="sidebar-title">可调分析运行资源</div>
      <a-menu mode="inline" v-model:openKeys="openKeys" :selected-keys="[current]" @click="onMenuClick">
        <a-sub-menu key="g-ledger">
          <template #title>台账管理</template>
          <a-menu-item key="workbench">台账信息</a-menu-item>
          <a-menu-item key="templateMapping">模板与映射</a-menu-item>
          <a-menu-item key="report">上报管理</a-menu-item>
          <a-menu-item key="sync">省地同步</a-menu-item>
          <a-menu-item key="archive">台账归档</a-menu-item>
        </a-sub-menu>
      </a-menu>
    </div>
    <div class="content">
      <component :is="pages[current as keyof typeof pages]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Workbench from './pages/v1/Workbench.vue';
import TemplateMapping from './pages/v1/TemplateMapping.vue';
import ReportBook from './pages/v1/ReportBook.vue';
import SyncBook from './pages/v1/SyncBook.vue';
import ArchiveBook from './pages/v1/ArchiveBook.vue';

// 重构前页面组织：本地台账/省地对比/属地管理在台账信息页内；记录页可写操作（新建批次/刷新/执行/取消/触发同步）
const pages = { workbench: Workbench, templateMapping: TemplateMapping, report: ReportBook, sync: SyncBook, archive: ArchiveBook };
const current = ref('workbench');
const openKeys = ref<string[]>(['g-ledger']);
function onMenuClick({ key }: { key: string }) {
  current.value = key;
}
</script>

<style scoped lang="less">
.app-layout { display: flex; height: 100vh; overflow: hidden; }
.sidebar {
  width: 200px; min-width: 200px; background: #fff; border-right: 1px solid #e8e8e8; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.18); border-radius: 3px; }
}
.sidebar-title { padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e8e8e8; white-space: nowrap; }
.content { flex: 1; overflow: auto; background: #f0f2f5; }
</style>
