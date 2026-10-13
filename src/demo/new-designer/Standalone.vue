<!--
  新设计器独立全屏入口

  通过 http://localhost:3000/#/designer 直接访问,绕过 App.vue 的 antd 顶栏
  与 tab 切换,让 src/designer 独占整个窗口。
  工具栏与三栏布局与 printNewDesigner 保持一致,只是去掉了 a-card / a-page-header
  包装,把画布高度从 720px 改为 calc(100vh - 64px) 撑满视口。
-->
<template>
  <div class="standalone">
    <header class="toolbar">
      <div class="brand">vue3-hiprint · 新设计器(实验)</div>
      <a-space :size="4" wrap>
        <a-button type="primary" size="small" @click="onPrint">
          <template #icon><PrinterOutlined /></template>
          打印预览
        </a-button>
        <a-button size="small" @click="showJson = true">查看 JSON</a-button>
        <a-button size="small" @click="onExport">导出 JSON</a-button>
        <a-upload :before-upload="onImport" :show-upload-list="false" accept="application/json">
          <a-button size="small">导入 JSON</a-button>
        </a-upload>
        <a-divider type="vertical" />
        <a-tooltip title="水平左对齐">
          <a-button size="small" :disabled="!hasSelection" @click="onAlignH('left')">
            <template #icon><AlignLeftOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="水平居中">
          <a-button size="small" :disabled="!hasSelection" @click="onAlignH('center')">
            <template #icon><AlignCenterOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="水平右对齐">
          <a-button size="small" :disabled="!hasSelection" @click="onAlignH('right')">
            <template #icon><AlignRightOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-divider type="vertical" />
        <a-tooltip title="垂直顶对齐">
          <a-button size="small" :disabled="!hasSelection" @click="onAlignV('top')">
            <template #icon><VerticalAlignTopOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="垂直居中">
          <a-button size="small" :disabled="!hasSelection" @click="onAlignV('middle')">
            <template #icon><VerticalAlignMiddleOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="垂直底对齐">
          <a-button size="small" :disabled="!hasSelection" @click="onAlignV('bottom')">
            <template #icon><VerticalAlignBottomOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-divider type="vertical" />
        <a-popconfirm title="重置当前模板?" ok-text="重置" cancel-text="取消" @confirm="onReset">
          <a-button size="small" danger>重置</a-button>
        </a-popconfirm>
        <a-tag color="blue">A4 · 210×297mm</a-tag>
        <a-button size="small" @click="backToDemo">返回 demo 列表</a-button>
      </a-space>
    </header>

    <div class="canvas">
      <PrintDesigner
        ref="designerRef"
        :initial-template="initialTemplate"
        @json-import-error="onJsonError"
      />
    </div>

    <a-modal
      v-model:open="showJson"
      title="当前模板 JSON"
      :footer="null"
      width="720px"
    >
      <pre style="max-height: 60vh; overflow: auto; background: #f6f8fa; padding: 12px; font-size: 12px">{{ jsonText }}</pre>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  PrintDesigner,
  printTemplate,
  alignHorizontal,
  alignVertical,
  createTemplate,
  createText,
  createTable,
  type Template,
  type HorizontalAlign,
  type VerticalAlign,
} from '../../designer'

const designerRef = ref<InstanceType<typeof PrintDesigner> | null>(null)
const showJson = ref(false)

const hasSelection = computed(() => !!designerRef.value?.designer.selectedId.value)

const initialTemplate: Template = createTemplate({
  elements: [
    createText({
      x: 75, y: 20, w: 60, h: 10,
      text: '销售单', fontSize: 18, fontWeight: 'bold', align: 'center',
    }),
    createText({ x: 20, y: 40, w: 60, h: 6, text: '客户:示例客户' }),
    createText({ x: 20, y: 50, w: 60, h: 6, text: '日期:2026-10-13' }),
    createTable({ x: 20, y: 60, w: 170, h: 80, dataPath: 'rows' }),
  ],
})

const printData = {
  rows: [
    { name: '商品 A', qty: 2, price: 100 },
    { name: '商品 B', qty: 1, price: 250 },
    { name: '商品 C', qty: 3, price: 80 },
    { name: '商品 D', qty: 1, price: 500 },
    { name: '商品 E', qty: 4, price: 60 },
    { name: '商品 F', qty: 2, price: 180 },
    { name: '商品 G', qty: 5, price: 30 },
    { name: '商品 H', qty: 1, price: 999 },
  ],
}

const jsonText = computed(() => designerRef.value?.toJson() ?? '')

async function onPrint() {
  const tpl = designerRef.value?.designer.template.value
  if (!tpl) return
  const ok = await printTemplate(tpl, printData)
  if (!ok) message.error('打印失败')
}

function onExport() {
  const json = designerRef.value?.toJson() ?? ''
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template.json'
  a.click()
  URL.revokeObjectURL(url)
  message.success('已导出')
}

function onImport(file: File): boolean {
  const reader = new FileReader()
  reader.onload = (e) => {
    const raw = (e.target?.result as string) ?? ''
    const ok = designerRef.value?.loadJson(raw) ?? false
    if (ok) message.success('导入成功')
  }
  reader.readAsText(file)
  return false
}

function onJsonError() {
  message.error('JSON 格式不合法(需要 version=1.0 + paper + elements)')
}

function onAlignH(mode: HorizontalAlign) {
  const d = designerRef.value?.designer
  const id = d?.selectedId.value
  if (!d || !id) return
  d.template.value = alignHorizontal(d.template.value, id, mode)
}

function onAlignV(mode: VerticalAlign) {
  const d = designerRef.value?.designer
  const id = d?.selectedId.value
  if (!d || !id) return
  d.template.value = alignVertical(d.template.value, id, mode)
}

function onReset() {
  if (!designerRef.value) return
  designerRef.value.designer.load(createTemplate())
  message.info('已重置')
}

function backToDemo() {
  location.hash = ''
}
</script>

<style scoped>
.standalone {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  overflow-x: auto;
  white-space: nowrap;
}
.brand {
  font-weight: 600;
  font-size: 14px;
  color: #1890ff;
  flex: 0 0 auto;
}
.canvas {
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px;
  overflow: hidden;
}
</style>
