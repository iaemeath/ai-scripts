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

app.get('*', (c) => {
	const rel = c.req.path === '/' ? 'index.html' : c.req.path.slice(1);
	const abs = path.join(dist, rel);
	if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
		return c.body(fs.readFileSync(abs), 200, {
			'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
		});
	}
	const idx = path.join(dist, 'index.html'); // SPA fallback
	if (fs.existsSync(idx)) return c.body(fs.readFileSync(idx), 200, { 'Content-Type': MIME['.html'] });
	return c.text('not found', 404);
});

const port = 8792;

/** Electron 主进程内嵌启动入口（AI_SCRIPTS_EMBEDDED=1 时由 electron/main.mjs 调用）：
 *  监听错误走 reject（端口占用等），resolve 于就绪后，主进程再开窗口。 */
export function startServer(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = serve({ fetch: app.fetch, port }, (info) => resolve(info.port));
		server.on('error', reject);
	});
}

if (process.env.AI_SCRIPTS_EMBEDDED !== '1') {
	serve({ fetch: app.fetch, port }, ({ port }) => {
		console.log(`ai-scripts server: http://localhost:${port}  (api at /api/scripts)`);
	});
}
