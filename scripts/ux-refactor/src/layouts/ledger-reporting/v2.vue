<template>
  <div class="app-layout">
    <div class="sidebar">
      <div class="sidebar-title">台账数据上报</div>
      <a-menu mode="inline" :selected-keys="[current]" @click="onMenuClick">
        <a-menu-item key="workbench">台账信息</a-menu-item>
        <a-menu-item key="templateMapping">模板与映射</a-menu-item>
        <a-menu-item key="report">上报记录</a-menu-item>
        <a-menu-item key="sync">同步记录</a-menu-item>
        <a-menu-item key="archive">归档记录</a-menu-item>
      </a-menu>
    </div>
    <div class="content">
      <component :is="pages[current as keyof typeof pages]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Workbench from './pages/v2/Workbench.vue';
import TemplateMapping from './pages/v2/TemplateMapping.vue';
import ReportBook from './pages/v2/ReportBook.vue';
import SyncBook from './pages/v2/SyncBook.vue';
import ArchiveBook from './pages/v2/ArchiveBook.vue';

// 重构后页面组织：写命令收口工作台；记录页改名「记录」且只读（账本化）
const pages = { workbench: Workbench, templateMapping: TemplateMapping, report: ReportBook, sync: SyncBook, archive: ArchiveBook };
const current = ref('workbench');
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
