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
        <a-button size="small" @click="showJson = true">查看 JSON</a-button>
        <a-button size="small" @click="onExport">导出 JSON</a-button>
        <a-upload :before-upload="onImport" :show-upload-list="false" accept="application/json">
          <a-button size="small">导入 JSON</a-button>
        </a-upload>
        <a-divider type="vertical" />
        <a-tag color="blue">A4 · 210×297mm</a-tag>
        <a-button size="small" @click="backToDemo">返回 demo 列表</a-button>
      </a-space>
    </header>

    <div class="canvas">
      <PrintDesigner
        ref="designerRef"
        :initial-template="initialTemplate"
        :print-data="printData"
        @json-import-error="onJsonError"
        @print-error="message.error('打印失败')"
        @print-ok="message.success('已发送打印任务')"
        @notice="onNotice"
        @save="onSave"
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
  createTemplate,
  createText,
  createTable,
  type Template,
} from '../../designer'

const designerRef = ref<InstanceType<typeof PrintDesigner> | null>(null)
const showJson = ref(false)

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

function onNotice(msg: string, type: 'info' | 'success' | 'warning' | 'error') {
  message[type](msg)
}

function onSave() {
  message.success('已保存到内存(暂未持久化到后端)')
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
