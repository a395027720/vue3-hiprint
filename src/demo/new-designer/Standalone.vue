<!--
  新设计器独立全屏入口

  通过 http://localhost:3000/#/designer 直接访问,绕过 App.vue 的 antd 顶栏
  与 tab 切换,让 src/designer 独占整个窗口。
  顶部品牌条已经在 PrintDesigner 内部(TopBar),这里不再额外包一层。
-->
<template>
  <div class="standalone">
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  PrintDesigner,
  createTemplate,
  createText,
  createTable,
  type Template,
} from '../../designer'

const designerRef = ref<InstanceType<typeof PrintDesigner> | null>(null)

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

function onJsonError() {
  message.error('JSON 格式不合法(需要 version=1.0 + paper + elements)')
}

function onNotice(msg: string, type: 'info' | 'success' | 'warning' | 'error') {
  message[type](msg)
}

function onSave() {
  message.success('已保存到内存(暂未持久化到后端)')
}
</script>

<style scoped>
.standalone {
  height: 100vh;
  background: #f5f5f5;
}
</style>
