import axios from 'axios';
import { message } from 'ant-design-vue';
import { mockRoute } from '../mock/oldApiMock';

// 作品集演示版：纯前端运行，请求在本实例 adapter 层拦截并返回 mock 数据（src/mock/oldApiMock.ts）
const USE_MOCK = true;

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

if (USE_MOCK) {
  request.defaults.adapter = async (config) => {
    let body: any;
    try {
      body = mockRoute((config.method || 'get').toLowerCase(), config.url || '', config);
    } catch (e: any) {
      body = { code: 500, msg: e?.message || 'mock error', data: null };
    }
    return {
      data: body,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as any;
  };
}

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const msg = data?.msg || data?.message || error.message || '请求异常';
    message.error(msg);
    return Promise.reject(error);
  }
);

export default request;
