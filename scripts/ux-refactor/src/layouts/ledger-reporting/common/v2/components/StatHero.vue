<script setup lang="ts">
/**
 * Hero 指标卡:左侧 1 个主指标(大数字),右侧内联支撑项(小标签+数值)。
 * 替代等权重统计卡砖墙——主指标一眼可读,支撑项同行扫读;
 * 支撑项可声明 clickable,点击时向上抛 support-click(key) 由页面联动筛选。
 */
interface SupportItem {
  key: string;
  label: string;
  value: number | string;
  /** 语义色只用于异常/进行态,正常态不着色 */
  color?: string;
  clickable?: boolean;
}

defineProps<{
  title: string;
  value: number | string;
  suffix?: string;
  supports: SupportItem[];
}>();

const emit = defineEmits<{ (e: 'support-click', key: string): void }>();
</script>

<template>
  <a-card size="small" class="stat-hero">
    <div class="hero-row">
      <div class="hero-main">
        <div class="hero-title">{{ title }}</div>
        <div class="hero-value">{{ value }}<span v-if="suffix" class="hero-suffix">{{ suffix }}</span></div>
      </div>
      <div class="hero-divider" />
      <div class="hero-supports">
        <span
          v-for="s in supports"
          :key="s.key"
          class="s-item"
          :class="{ clickable: s.clickable }"
          :title="s.clickable ? `点击筛选:${s.label}` : undefined"
          @click="s.clickable && emit('support-click', s.key)"
        >
          <span class="s-label">{{ s.label }}</span>
          <span class="s-value" :style="s.color ? { color: s.color } : undefined">{{ s.value }}</span>
        </span>
      </div>
    </div>
  </a-card>
</template>

<style scoped lang="less">
.stat-hero {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;

  :deep(.ant-card-body) {
    width: 100%;
  }
}
.hero-row {
  display: flex;
  align-items: center;
  gap: 20px;
}
.hero-main {
  flex-shrink: 0;
}
.hero-title {
  color: #8c8c8c;
  font-size: 13px;
  margin-bottom: 4px;
}
.hero-value {
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.hero-suffix {
  font-size: 16px;
  font-weight: 400;
  color: #8c8c8c;
  margin-left: 2px;
}
.hero-divider {
  width: 1px;
  align-self: stretch;
  background: #f0f0f0;
}
.hero-supports {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  flex: 1;
  min-width: 0;
}
.s-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.s-label {
  color: #8c8c8c;
  font-size: 13px;
}
.s-value {
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.s-item.clickable {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;

    .s-label {
      color: #1677ff;
    }
  }
}
</style>
