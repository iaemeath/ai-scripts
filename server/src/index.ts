// ai-scripts server entry — Hono app: /api/scripts + (production) the Vue build.
// In dev, Vite serves the frontend on :5175 and proxies /api here.

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scripts } from './routes.js';

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api/scripts', scripts);

// Static frontend (production, `npm run build` → web/dist). No SEA assets yet —
// the exe build is out of scope for the first cut (see MIGRATION.md).
const MIME: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
};

const here = path.dirname(fileURLToPath(import.meta.url));
// web/dist：Electron dev 态由 main.mjs 注入；缺省按相对位置解析（server/src → 仓库根；
// 打包态 bundle 在 asar/electron/ 内 → ../web/dist，同一条相对链天然成立）
const dist = process.env.AI_SCRIPTS_WEB_DIST || path.resolve(here, '../../web/dist');

// 请求路径零同步 IO（同 9-24 探测重构的原则）：readdir/stat/readFile 全异步。
// 缓存策略：vite 产物 assets/* 文件名带内容 hash → immutable 一年；index.html 等入口
// 必须每次回源校验（版本更新靠它），给 no-cache。
app.get('*', async (c) => {
	const rel = c.req.path === '/' ? 'index.html' : c.req.path.slice(1);
	const abs = path.join(dist, rel);
	try {
		const st = await fs.promises.stat(abs);
		if (st.isFile()) {
			const body = await fs.promises.readFile(abs);
			const immutable = rel.startsWith('assets/');
			return c.body(body, 200, {
				'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
				'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
			});
		}
	} catch {
		/* 落到 SPA fallback */
	}
	const idx = path.join(dist, 'index.html'); // SPA fallback
	try {
		const body = await fs.promises.readFile(idx);
		return c.body(body, 200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
	} catch {
		return c.text('not found', 404);
	}
});

const port = 8792;
// 只绑回环：文件读写 API（/:id/file）能触达卡片目录（含密钥文件），不暴露局域网
const HOST = '127.0.0.1';

/** Electron 主进程内嵌启动入口（AI_SCRIPTS_EMBEDDED=1 时由 electron/main.mjs 调用）：
 *  监听错误走 reject（端口占用等），resolve 于就绪后，主进程再开窗口。 */
export function startServer(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = serve({ fetch: app.fetch, hostname: HOST, port }, (info) => resolve(info.port));
		server.on('error', reject);
	});
}

if (process.env.AI_SCRIPTS_EMBEDDED !== '1') {
	serve({ fetch: app.fetch, hostname: HOST, port }, ({ port, address }) => {
		console.log(`ai-scripts server: http://${address}:${port}  (api at /api/scripts)`);
	});
}
