import { createApp, defineComponent, h, ref, onMounted, onBeforeUnmount } from 'vue'
import App from './App.vue'
import StandaloneDesigner from './demo/new-designer/Standalone.vue'

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

// 顶层入口分支:hash=#/designer 走全屏独立新设计器,绕过 App.vue 的
// antd 顶栏与 5-tab 切换,让 src/designer 独占整个窗口。
// 用一个响应式 Root 包裹 + 监听 hashchange,这样从 demo 列表点"新设计器"
// 按钮改 location.hash 也能切到 Standalone(不再是启动时一次性决定)。
const Root = defineComponent({
  name: 'Root',
  setup() {
    const isStandalone = ref(
      typeof location !== 'undefined' && location.hash === '#/designer',
    )
    const onHash = () => {
      isStandalone.value = location.hash === '#/designer'
    }
    onMounted(() => window.addEventListener('hashchange', onHash))
    onBeforeUnmount(() => window.removeEventListener('hashchange', onHash))
    return () => h(isStandalone.value ? StandaloneDesigner : App)
  },
})

const app = createApp(Root)
app.use(Antd)
for (const [name, comp] of Object.entries(Icons)) {
  app.component(name, comp)
}
app.use(hiPrintPlugin, '$hiPrint', true)
app.use(Storage, options)

app.mount('#app')
