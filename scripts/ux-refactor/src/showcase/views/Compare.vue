<template>
  <div class="compare" v-if="entry">
    <div class="toolbar">
      <a-button type="text" size="small" @click="router.push('/')">← 画廊</a-button>
      <span class="name">{{ entry.name }} · 重构前后同屏对比</span>
      <a-button size="small" @click="router.push(`/layout/${entry.id}/v2`)">只看新版</a-button>
    </div>
    <div class="panes">
      <div class="pane" v-for="v in entry.versions" :key="v">
        <div class="pane-head">
          <a-tag :color="v === 'v1' ? 'default' : 'green'">{{ v === 'v1' ? '重构前 BEFORE' : '重构后 AFTER' }}</a-tag>
        </div>
        <iframe :src="frameSrc(v)" :title="entry.name + ' ' + v"></iframe>
      </div>
    </div>
  </div>
  <a-result v-else status="404" title="布局不存在" sub-title="返回画廊查看全部布局">
    <template #extra><a-button type="primary" @click="router.push('/')">返回画廊</a-button></template>
  </a-result>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getLayout } from '../registry';

const route = useRoute();
const router = useRouter();
const entry = computed(() => getLayout(route.params.id as string));

// 页面级布局假设占满视口，同屏双实例用 iframe 隔离样式与全局单例
function frameSrc(v: string) {
  return `${location.origin}${location.pathname}#/layout/${route.params.id}/${v}?bare=1`;
}
</script>

<style scoped lang="less">
.compare { height: 100vh; display: flex; flex-direction: column; background: #f0f2f5; }
.toolbar {
  height: 44px; display: flex; align-items: center; gap: 12px; padding: 0 12px;
  background: #001529; flex: none;
  .name { color: #fff; font-weight: 600; }
}
.panes { flex: 1; display: flex; min-height: 0; }
.pane { flex: 1; display: flex; flex-direction: column; border-right: 1px solid #d9d9d9; min-width: 0;
  &:last-child { border-right: none; } }
.pane-head { height: 30px; display: flex; align-items: center; padding: 0 8px; background: #fff; border-bottom: 1px solid #f0f0f0; flex: none; }
iframe { flex: 1; border: none; width: 100%; }
</style>
