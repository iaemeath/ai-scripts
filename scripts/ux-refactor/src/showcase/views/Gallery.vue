<template>
  <div class="gallery">
    <header class="hero">
      <h1>页面布局作品库</h1>
      <p>存储与展示页面级布局设计——每个布局自包含（组件 + mock + 元数据），支持版本对比。</p>
      <div class="stats">{{ layouts.length }} 个布局 · {{ versionCount }} 个版本</div>
    </header>
    <div class="grid">
      <div v-for="l in layouts" :key="l.id" class="card" @click="openDefault(l)">
        <div class="cover">
          <img v-if="l.screenshots?.v2 || l.screenshots?.v1" :src="l.screenshots?.v2 || l.screenshots?.v1" :alt="l.name" />
          <div v-else class="cover-blank">{{ l.name }}</div>
          <div class="badges">
            <a-tag v-for="v in l.versions" :key="v" color="blue">{{ v.toUpperCase() }}</a-tag>
            <a-tag v-if="l.versions.length > 1" color="orange">可对比</a-tag>
          </div>
        </div>
        <div class="body">
          <div class="title">{{ l.name }}</div>
          <div class="desc">{{ l.desc }}</div>
          <div class="tags">
            <a-tag v-for="t in l.tags" :key="t">{{ t }}</a-tag>
          </div>
          <div class="actions" @click.stop>
            <a-space>
              <a-button v-for="v in l.versions" :key="v" size="small" @click="go(l.id, v)">{{ v === 'v1' ? '旧版' : '新版' }}</a-button>
              <a-button v-if="l.versions.length > 1" size="small" type="primary" ghost @click="goCompare(l.id)">对比</a-button>
            </a-space>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { layouts, type LayoutEntry } from '../registry';

const router = useRouter();
const versionCount = computed(() => layouts.reduce((n, l) => n + l.versions.length, 0));

function openDefault(l: LayoutEntry) {
  go(l.id, l.versions[l.versions.length - 1]);
}
function go(id: string, ver: string) {
  router.push(`/layout/${id}/${ver}`);
}
function goCompare(id: string) {
  router.push(`/compare/${id}`);
}
</script>

<style scoped lang="less">
.gallery {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 32px clamp(24px, 6vw, 96px);
}
.hero {
  margin-bottom: 28px;
  h1 { margin: 0 0 8px; font-size: 26px; }
  p { margin: 0 0 10px; color: #666; }
  .stats { color: #999; font-size: 13px; }
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}
.card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ececec;
  transition: box-shadow 0.2s, transform 0.2s;
  &:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.09); transform: translateY(-2px); }
}
.cover {
  position: relative;
  height: 180px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
  .cover-blank {
    height: 100%; display: flex; align-items: center; justify-content: center;
    color: #bbb; font-size: 18px; letter-spacing: 2px;
    background: linear-gradient(135deg, #eef2ff 0%, #f8faff 100%);
  }
  .badges { position: absolute; top: 8px; left: 8px; display: flex; gap: 4px; }
}
.body { padding: 14px 16px 16px; }
.title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.desc { color: #666; font-size: 13px; min-height: 38px; margin-bottom: 8px; }
.tags { margin-bottom: 12px; :deep(.ant-tag) { margin-inline-end: 4px; } }
.actions { border-top: 1px dashed #f0f0f0; padding-top: 10px; }
</style>
