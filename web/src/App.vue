<script setup lang="ts">
// ai-scripts shell — 单页应用极简壳：顶部一条应用栏，无侧栏（脚本卡片墙即首页）。
</script>

<template>
  <el-container class="app-shell">
    <el-header class="app-header">
      <div class="app-title">AI 脚本</div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}
.app-shell {
  height: 100vh;
}
.app-header {
  border-bottom: var(--el-border-color) solid 1px;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
}
.app-title {
  font-weight: 600;
}
.app-main {
  padding: 0;
  background: var(--el-bg-color-page);
}
</style>
