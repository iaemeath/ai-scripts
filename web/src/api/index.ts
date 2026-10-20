// API client — scripts routes only. Everything runs locally; no host targeting.

import type { BrowseResult, LogFileInfo, LogTail, ScriptCard, ScriptCreateInput } from '../types/script';

async function getJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	return res.json() as Promise<T>;
}

async function putJson<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	return res.json() as Promise<T>;
}

async function del<T>(url: string): Promise<T> {
	const res = await fetch(url, { method: 'DELETE' });
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	return res.json() as Promise<T>;
}

export const api = {
	listScripts: () =>
		getJson<ScriptCard[]>('/api/scripts'),
	createScript: (body: ScriptCreateInput) =>
		postJson<{ ok: true; id: string }>('/api/scripts', body),
	deleteScript: (id: string) =>
		del<{ ok: true }>(`/api/scripts/${encodeURIComponent(id)}`),
	startScript: (id: string) =>
		postJson<{ ok: boolean; status?: { status: string }; reason?: string; logTail?: string }>(`/api/scripts/${encodeURIComponent(id)}/start`, {}),
	openScript: (id: string) =>
		postJson<{ ok: true }>(`/api/scripts/${encodeURIComponent(id)}/open`, {}),
	stopScript: (id: string) =>
		postJson<{ ok: true; killed: boolean }>(`/api/scripts/${encodeURIComponent(id)}/stop`, {}),
	readCardFile: (id: string, path: string) =>
		getJson<{ path: string; content: string }>(`/api/scripts/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}`),
	writeCardFile: (id: string, path: string, content: string) =>
		putJson<{ ok: true }>(`/api/scripts/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}`, { content }),
	browse: (path?: string) =>
		getJson<BrowseResult>(`/api/scripts/browse?path=${encodeURIComponent(path ?? '')}`),
	listLogs: (id: string) =>
		getJson<LogFileInfo[]>(`/api/scripts/${encodeURIComponent(id)}/logs`),
	readLogTail: (id: string, name: string, maxLen = 4000) =>
		getJson<LogTail>(`/api/scripts/${encodeURIComponent(id)}/logs/tail?name=${encodeURIComponent(name)}&maxLen=${maxLen}`),
};
