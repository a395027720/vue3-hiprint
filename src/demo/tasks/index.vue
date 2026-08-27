<template>
  <a-card>
    <!-- 顶部 toolbar（tasks 不需要 mode 选择、不需要缩放） -->
    <a-row :gutter="[8, 0]" style="margin-bottom: 10px">
      <a-col :span="24">
        <a-space>
          <PaperToolbar
            :template="hiprintTemplate"
            :show-scale="false"
            :show-paper-type="true"
            :default-custom-paper="{ width: 80, height: 60 }"
            @clear="clearPaper"
          />
          <!-- 打印数量 -->
          打印数量：
          <a-slider v-model:value="count" style="width: 200px" :min="1" :max="10000" />
          <a-input-number v-model:value="count" :min="1" :max="10000" style="margin-left: 16px" />
          <a-button-group>
            <a-button type="primary" icon="eye" @click="preView">预览</a-button>
            <a-button type="primary" @click="print">直接打印<template #icon><printer-outlined /></template></a-button>
          </a-button-group>
          <a-button-group>
            <a-button type="primary" icon="save" @click="save">保存</a-button>
          </a-button-group>
          <json-view :template="hiprintTemplate" />
        </a-space>
      </a-col>
    </a-row>

    <PrintLayout>
      <template #right>
        <div id="PrintElementOptionSetting"></div>
      </template>
    </PrintLayout>

    <PreviewModal ref="previewRef" />
  </a-card>
</template>

<script setup>
import { ref, markRaw, onMounted, h } from 'vue'
import { Modal, message, notification, Button } from 'ant-design-vue'
import TaskRunner from 'concurrent-tasks'

import PrintLayout from '../components/PrintLayout.vue'
import PaperToolbar from '../components/PaperToolbar.vue'
import PreviewModal from '../components/PreviewModal.vue'

import jsonView from '../json-view.vue'
import { hiprint } from '../../index'
import provider from './providers'
import panel from './panel'
import printData from './print-data'

// fix #1: 原 name="printCustom" 与 custom demo 撞名（影响 keep-alive 缓存 key）
defineOptions({ name: 'printTasks' })

const count = ref(1)
const hiprintTemplate = ref(null)
const previewRef = ref()

function loadTemplate() {
  const raw = localStorage.getItem('hiPrint-KEY_TEMPLATE_TASKS')
  if (raw) {
    try { return JSON.parse(raw) } catch (_) { /* 解析失败回退到默认 */ }
  }
  return panel
}

function buildTemplate() {
  $('#hiprint-printTemplate').empty()
  hiprintTemplate.value = markRaw(
    new hiprint.PrintTemplate({
      template: loadTemplate(),
      settingContainer: '#PrintElementOptionSetting',
      paginationContainer: '.hiprint-printPagination'
    })
  )
  hiprintTemplate.value.design('#hiprint-printTemplate')
}

function preView() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const w = tpl.editingPanel?.width ?? 80
  previewRef.value?.show(tpl, printData, w)
}

function print() {
  if (!hiprintTemplate.value) return
  if (window.hiwebSocket?.opened) {
    console.log(hiprintTemplate.value.getPrinterList())
    tasksPrint()
    return
  }
  Modal.error({
    title: '客户端未连接',
    content: '请先下载并运行 electron-hiprint 打印服务（详见 README 中的 electron-hiprint 章节）。',
    okText: '我知道了'
  })
}

function tasksPrint() {
  // 文档：https://concurrent-tasks.js.org/
  const runner = new TaskRunner()
  runner.setConcurrency(1)
  const tasksKey = `open${Date.now()}`
  const tasks = []
  for (let i = 1; i <= count.value; i++) {
    const key = `task${i}`
    tasks.push((done) => {
      realPrint(runner, done, key, i, { count: i.toString() }, tasksKey)
    })
  }
  runner.addMultiple(tasks)
  openNotification(runner, tasksKey)
}

function realPrint(runner, done, key, i, printDataArg, tasksKey) {
  notification.info({
    key,
    placement: 'topRight',
    duration: null,
    message: `正在准备打印第 ${i} 张`,
    description: '队列运行中...'
  })
  const tpl = new hiprint.PrintTemplate({ template: loadTemplate() })
  tpl.print2(printDataArg, { printer: '', title: key })
  tpl.on('printSuccess', () => {
    const info = runner.tasks.list.length > 1 ? '准备打印下一张' : '已完成打印'
    notification.success({
      key,
      placement: 'topRight',
      message: key + ' 打印成功',
      description: info
    })
    done()
    if (!runner.isBusy()) {
      notification.close(tasksKey)
    }
  })
  tpl.on('printError', () => {
    notification.close(key)
    done()
    message.error('打印失败，已加入重试队列中')
    // 这里把 i + 1 是为了避免死循环——原代码有这个 bug
    runner.add(realPrint.bind(null, runner, done, key, i + 1, printDataArg))
  })
}

// fix #3: 原 openNotification 用 h('a-button', {props, on}, ...) 是 Vue 2 风格
// 改用 Vue 3 兼容写法：h(Button, props, slot)
// 因为 main.js 把 icon 全量注册，template 里 <a-button> 可用，但 h 函数需要组件引用
function openNotification(runner, tasksKey) {
  notification.open({
    key: tasksKey,
    message: '队列运行中...',
    duration: 0,
    placement: 'topLeft',
    description: '点击关闭所有任务',
    btn: () => h(
      Button,
      {
        type: 'default',
        size: 'small',
        onClick: () => {
          notification.close(tasksKey)
          runner.removeAll()
          message.info('已移除所有任务')
        }
      },
      { default: () => '关闭任务' }
    )
  })
}

// fix #2: 原 save() 把读出来的旧 template 写回 localStorage，json 从未被保存
function save() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const json = tpl.getJson()
  console.log(json)
  console.log(JSON.stringify(json))
  localStorage.setItem('hiPrint-KEY_TEMPLATE_TASKS', JSON.stringify(json))
  message.info('保存成功')
}

function clearPaper() {
  try {
    hiprintTemplate.value?.clear()
  } catch (e) {
    message.error(`操作失败: ${e}`)
  }
}

onMounted(() => {
  hiprint.init({ providers: [provider] })
  $('.hiprintEpContainer').empty()
  hiprint.PrintElementTypeManager.build('.hiprintEpContainer', 'taskProviderModule')
  buildTemplate()
})
</script>
