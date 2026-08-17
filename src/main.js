import { createApp } from 'vue'
import App from './App.vue'

import Antd from 'ant-design-vue'
// antd-vue 2.2.x 提供的全局样式入口（保持与 1.x 相似的视觉）
import 'ant-design-vue/dist/antd.css'

// 全局注册 @ant-design/icons-vue 全部图标，模板里可以直接用 <xxx-outlined />
import * as Icons from '@ant-design/icons-vue'

import { hiPrintPlugin } from './index'

import Storage from 'vue-ls'
let options = {
  namespace: 'hiPrint-',
  name: 'ls',
  storage: 'local',
}

const app = createApp(App)
app.use(Antd)
for (const [name, comp] of Object.entries(Icons)) {
  app.component(name, comp)
}
app.use(hiPrintPlugin, '$hiPrint', true)
app.use(Storage, options)

app.mount('#app')