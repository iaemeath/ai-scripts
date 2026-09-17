import { createApp } from 'vue';
import Antd, { message } from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';
import router from './showcase/router';

message.config({ top: '12px', maxCount: 3 });

createApp(App).use(router).use(Antd).mount('#app');
