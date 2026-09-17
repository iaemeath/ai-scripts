<template>
  <div class="layout-view" v-if="entry">
    <div class="toolbar" v-if="!bare">
      <a-button type="text" size="small" @click="router.push('/')">← 画廊</a-button>
      <span class="name">{{ entry.name }}</span>
      <a-radio-group v-model:value="ver" size="small" button-style="solid">
        <a-radio-button v-for="v in entry.versions" :key="v" :value="v">{{ v === 'v1' ? '重构前' : '重构后' }}</a-radio-button>
      </a-radio-group>
      <a-button v-if="entry.versions.length > 1" size="small" @click="router.push(`/compare/${entry.id}`)">同屏对比</a-button>
      <span class="ver-tag">{{ ver }} · {{ entry.desc }}</span>
    </div>
    <div class="stage">
      <component :is="comp" v-if="comp" />
    </div>
  </div>
  <a-result v-else status="404" title="布局不存在" sub-title="返回画廊查看全部布局">
    <template #extra><a-button type="primary" @click="router.push('/')">返回画廊</a-button></template>
  </a-result>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getLayout } from '../registry';

const route = useRoute();
const router = useRouter();
const entry = computed(() => getLayout(route.params.id as string));
const bare = computed(() => route.query.bare === '1');
const ver = ref<string>((route.params.ver as string) || 'v2');

watch(() => route.params.ver, (v) => { if (v) ver.value = v as string; });
watch(ver, (v) => {
  if (route.params.id) router.replace(`/layout/${route.params.id}/${v}`);
});

const comp = computed(() => entry.value?.comps[ver.value]);
</script>

<style scoped lang="less">
.layout-view { height: 100vh; display: flex; flex-direction: column; background: #f0f2f5; }
.toolbar {
  height: 44px; display: flex; align-items: center; gap: 12px; padding: 0 12px;
  background: #001529; flex: none;
  .name { color: #fff; font-weight: 600; }
  .ver-tag { color: rgba(255, 255, 255, 0.45); font-size: 12px; margin-left: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
.stage { flex: 1; overflow: auto; background: #fff; }
</style>
