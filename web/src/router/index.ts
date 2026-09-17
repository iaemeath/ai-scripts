import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
	{ path: '/', redirect: '/scripts' },
	{ path: '/scripts', name: 'scripts', component: () => import('../views/ScriptsView.vue') },
	{ path: '/scripts/new', name: 'script-new', component: () => import('../views/ScriptsView.vue') },
	{ path: '/scripts/:id/edit', name: 'script-edit', component: () => import('../views/ScriptsView.vue') },
];

export const router = createRouter({
	history: createWebHistory(),
	routes,
});
