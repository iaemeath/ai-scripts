import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'gallery', component: () => import('./views/Gallery.vue') },
    { path: '/layout/:id/:ver', name: 'layout', component: () => import('./views/LayoutView.vue') },
    { path: '/compare/:id', name: 'compare', component: () => import('./views/Compare.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

export default router;
