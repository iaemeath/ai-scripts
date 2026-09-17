import { defineAsyncComponent } from 'vue';

/**
 * 布局注册表（showcase 上下文与布局资产的唯一接缝）
 *
 * 约定优于配置：每个布局 = layouts/<系列>/<布局>/ 目录，内含
 *   - meta.ts   元数据（default export LayoutMeta）
 *   - v1.vue    可选，版本 1
 *   - v2.vue    可选，版本 2
 * 注册表按 glob 自动发现，布局目录增删无需改这里。
 */
export interface LayoutMeta {
  name: string;
  desc: string;
  tags: string[];
  screenshots?: { v1?: string; v2?: string };
  order?: number;
}

export interface LayoutEntry extends LayoutMeta {
  id: string;
  versions: ('v1' | 'v2')[];
  comps: Record<string, () => Promise<any>>;
}

const metaModules = import.meta.glob<{ default: LayoutMeta }>('../layouts/**/meta.ts', { eager: true });
const v1Modules = import.meta.glob('../layouts/**/v1.vue');
const v2Modules = import.meta.glob('../layouts/**/v2.vue');

const dirOf = (path: string) => path.split('/').slice(-2, -1)[0];

export const layouts: LayoutEntry[] = Object.entries(metaModules)
  .map(([path, mod]) => {
    const id = dirOf(path);
    const comps: Record<string, () => Promise<any>> = {};
    const versions: ('v1' | 'v2')[] = [];
    const v1Key = path.replace('meta.ts', 'v1.vue');
    const v2Key = path.replace('meta.ts', 'v2.vue');
    if (v1Modules[v1Key]) {
      comps.v1 = defineAsyncComponent(v1Modules[v1Key] as any);
      versions.push('v1');
    }
    if (v2Modules[v2Key]) {
      comps.v2 = defineAsyncComponent(v2Modules[v2Key] as any);
      versions.push('v2');
    }
    return { ...mod.default, id, versions, comps };
  })
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

export const getLayout = (id: string) => layouts.find((l) => l.id === id);
