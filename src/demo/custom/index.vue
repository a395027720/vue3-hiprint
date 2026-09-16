<template>
  <a-card>
    <!-- 顶部 toolbar -->
    <a-row :gutter="[8, 0]" style="margin-bottom: 10px">
      <a-col :span="4">
        <!-- 模式选择（custom 独有：切换会重建 PrintTemplate） -->
        <a-select
          v-model:value="mode"
          showSearch
          @change="onModeChange"
          option-label-prop="label"
          style="width: 100%"
        >
          <a-select-option
            v-for="(opt, idx) in modeList"
            :key="idx"
            :label="opt.name"
            :value="idx"
          >
            {{ opt.name }}
          </a-select-option>
        </a-select>
      </a-col>
      <a-col :span="20">
        <a-space>
          <PaperToolbar
            :template="hiprintTemplate"
            :show-scale="true"
            :show-paper-type="true"
            :default-custom-paper="{ width: 220, height: 80 }"
            :scale-with-center="true"
            @clear="clearPaper"
          />
          <a-button-group>
            <a-button type="primary" @click="preView">
              <template #icon><eye-outlined /></template>
              预览
            </a-button>
            <a-button type="primary" @click="print">
              <template #icon><printer-outlined /></template>
              直接打印
            </a-button>
            <a-button type="primary" @click="selectAll">全选元素</a-button>
          </a-button-group>
          <a-button-group>
            <a-button type="primary" @click="save">
              <template #icon><save-outlined /></template>
              保存
            </a-button>
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
import { ref, markRaw, onMounted } from 'vue'
import { Modal, message } from 'ant-design-vue'

import PrintLayout from '../components/PrintLayout.vue'
import PaperToolbar from '../components/PaperToolbar.vue'
import PreviewModal from '../components/PreviewModal.vue'

import jsonView from '../json-view.vue'
import { hiprint } from '../../index'
import providers from './providers'
import printData from './print-data'

defineOptions({ name: 'printCustom' })

const mode = ref(0)
const modeList = ref([])
const hiprintTemplate = ref(null)
const previewRef = ref()

function loadTemplates() {
  const raw = localStorage.getItem('hiPrint-KEY_TEMPLATES')
  if (!raw) return {}
  try { return JSON.parse(raw) } catch (_) { return {} }
}

function persistTemplates(templates) {
  localStorage.setItem('hiPrint-KEY_TEMPLATES', JSON.stringify(templates))
}

function buildTemplate() {
  $('#hiprint-printTemplate').empty()
  const provider = providers[mode.value]
  const allTemplates = loadTemplates()
  const template = allTemplates[provider.value] || {}
  hiprintTemplate.value = markRaw(
    new hiprint.PrintTemplate({
      template,
      dataMode: 1,
      history: false,
      onDataChanged: (type, json) => {
        console.log(type)
        console.log(json)
      },
      settingContainer: '#PrintElementOptionSetting',
      paginationContainer: '.hiprint-printPagination'
    })
  )
  hiprintTemplate.value.design('#hiprint-printTemplate')
}

function onModeChange() {
  const provider = providers[mode.value]
  if (!provider) return
  hiprint.init({ providers: [provider.f] })
  $('.hiprintEpContainer').empty()
  hiprint.PrintElementTypeManager.build('.hiprintEpContainer', provider.value)
  buildTemplate()
}

function selectAll() {
  hiprintTemplate.value?.selectAllElements()
}

function preView() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const w = tpl.editingPanel?.width ?? 220
  previewRef.value?.show(tpl, printData, w)
}

function print() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  if (window.hiwebSocket?.opened) {
    console.log(tpl.getPrinterList())
    tpl.print2(printData, { printer: '', title: 'hiprint测试打印' })
    return
  }
  Modal.error({
    title: '客户端未连接',
    content: '请先下载并运行 electron-hiprint 打印服务（详见 README 中的 electron-hiprint 章节）。',
    okText: '我知道了'
  })
}

function save() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const provider = providers[mode.value]
  const json = tpl.getJson()
  console.log(json)
  const templates = loadTemplates()
  templates[provider.value] = json
  persistTemplates(templates)
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
  modeList.value = providers.map((e) => ({
    type: e.type,
    name: e.name,
    value: e.value
  }))
  onModeChange()
})
</script>
