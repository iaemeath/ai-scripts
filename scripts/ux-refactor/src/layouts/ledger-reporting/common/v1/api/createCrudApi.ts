import request from './index';

export interface CrudApiOptions {
  module: string;
  resource: string;
  extra?: Record<string, { method: 'get' | 'post'; path: string | ((...args: any[]) => string) }>;
}

export interface CrudApi {
  list: (params?: Record<string, any>) => Promise<any>;
  info: (id: string) => Promise<any>;
  save: (data: Record<string, any>) => Promise<any>;
  update: (data: Record<string, any>) => Promise<any>;
  delete: (ids: string[]) => Promise<any>;
  [key: string]: Function;
}

export function createCrudApi(opts: CrudOptions): CrudApi {
  const base = `/czBalance/resource/${opts.module}/${opts.resource}`;
  const api: CrudApi = {
    list: (params?: Record<string, any>) => request.get(`${base}/list`, { params }),
    info: (id: string) => request.get(`${base}/info/${id}`),
    save: (data: Record<string, any>) => request.post(`${base}/save`, data),
    update: (data: Record<string, any>) => request.post(`${base}/update`, data),
    delete: (ids: string[]) => request.post(`${base}/delete`, ids),
  };
  if (opts.extra) {
    for (const [name, conf] of Object.entries(opts.extra)) {
      if (conf.method === 'get') {
        // 支持多参数 path 函数(如 compare(a,b)),第一个参数也可作为 params 对象
        api[name] = (first?: any, ...rest: any[]) => {
          const path = typeof conf.path === 'function' ? conf.path(first, ...rest) : conf.path;
          const params = rest.length === 0 && first !== null && typeof first === 'object' && !Array.isArray(first) ? first : undefined;
          return request.get(path, params ? { params } : undefined);
        };
      } else {
        api[name] = (data?: any, ...args: any[]) => {
          const path = typeof conf.path === 'function' ? conf.path(data, ...args) : conf.path;
          return request.post(path, data);
        };
      }
    }
  }
  return api;
}

type CrudOptions = CrudApiOptions;
