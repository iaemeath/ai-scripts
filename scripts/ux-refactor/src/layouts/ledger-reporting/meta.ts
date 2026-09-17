import type { LayoutMeta } from '../../showcase/registry';

/**
 * 作品：1.1 台账数据上报 · 页面重构（模块级，含完整导航 + 5 个页面）
 * v1 = 重构前完整应用形态；v2 = 重构后完整应用形态；同屏对比逐页切换。
 */
const meta: LayoutMeta = {
  name: '1.1 台账数据上报 · 重构',
  desc: '模块级重构：工作台与账本分离。v1 平铺 CRUD（写操作散落各页）；v2 角色三 tab 工作台 + 三本只读账（上报/归档/同步），差异前排行待办前置，写命令单一入口。左右两侧均可切换 5 个页面对照。',
  tags: ['模块级重构', '工作台', '账本', '三段式', '差异前排行'],
  order: 1,
  screenshots: {
    v1: '/screenshots/workbench-v1.jpeg',
    v2: '/screenshots/workbench-v2.jpeg',
  },
};
export default meta;
