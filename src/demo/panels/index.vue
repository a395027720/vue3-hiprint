<template>
  <a-card>
    <!-- 顶部 toolbar：模式选择 + 纸张/缩放/清空 + 预览打印 + 保存 + json-view -->
    <a-row :gutter="[8, 0]" style="margin-bottom: 10px">
      <a-col :span="4">
        <!-- 模式选择（panels 独有）-->
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
        <a-row>
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
            </a-button-group>
            <a-button-group>
              <a-button type="primary" @click="save">
                <template #icon><save-outlined /></template>
                保存
              </a-button>
            </a-button-group>
            <json-view :template="hiprintTemplate" />
          </a-space>
          <!-- 多面板容器（panels 独有，PrintTemplate paginationContainer 选择器）-->
          <div class="hiprint-printPagination" style="margin-top: 14px;"></div>
        </a-row>
      </a-col>
    </a-row>

    <!-- 三栏主体 -->
    <PrintLayout>
      <template #right>
        <div id="PrintElementOptionSetting"></div>
      </template>
    </PrintLayout>

    <PreviewModal ref="previewRef" />
  </a-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message, Modal, notification } from 'ant-design-vue'

import PrintLayout from '../components/PrintLayout.vue'
import PaperToolbar from '../components/PaperToolbar.vue'
import PreviewModal from '../components/PreviewModal.vue'

import jsonView from '../json-view.vue'
import { useHiprint } from '../../index'
import { providers, providerList } from './providers'
import printData from './print-data'

defineOptions({ name: 'printPanels' })

const mode = ref(0)
const modeList = ref([])
const previewRef = ref()

const {
  template: hiprintTemplate,
  build: buildTpl,
  print2,
  clear,
  initProviders,
} = useHiprint({
  designOptions: { grid: true },
  templateOptions: {
    defaultPanelName: '默认面板名称',
    onPanelAddClick: (panel, createPanel) => {
      panel.name = '新面板' + (panel.index + 1)
      message.success('弹出个东西,让你们知道,在这里可以自定义面板名称')
      notification.success({
        placement: 'topRight',
        message: '弹出个东西,让你们知道,在这里可以自定义面板名称',
        description: '自定义面板名称'
      })
      createPanel(panel)
    },
  },
  onGuardFail: () => Modal.error({
    title: '客户端未连接',
    content: '请先下载并运行 electron-hiprint 打印服务（详见 README 中的 electron-hiprint 章节）。',
    okText: '我知道了'
  }),
})

function onModeChange(idx) {
  const p = providerList[idx]
  if (!p) return
  initProviders({
    providers: [...providers],
    moduleName: p.value,
  })
}

function buildTemplate() {
  const raw = localStorage.getItem('hiPrint-KEY_TEMPLATES_PANELS')
  let templates = {}
  if (raw) {
    try { templates = JSON.parse(raw) } catch (_) { /* 解析失败保持默认空模板 */ }
  }
  buildTpl(templates)
}

function preView() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const w = tpl.editingPanel?.width ?? 220
  previewRef.value?.show(tpl, printData, w)
}

function print() {
  console.log(hiprintTemplate.value?.getPrinterList())
  print2(printData, { title: 'hiprint测试打印' })
}

function save() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const json = tpl.getJson()
  console.log(json)
  localStorage.setItem('hiPrint-KEY_TEMPLATES_PANELS', JSON.stringify(json))
  message.info('保存成功')
}

function clearPaper() {
  clear()
}

onMounted(() => {
  modeList.value = providerList
  onModeChange(0)
  buildTemplate()
})
</script>
