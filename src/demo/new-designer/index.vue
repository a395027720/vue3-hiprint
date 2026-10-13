<template>
  <a-card>
    <a-page-header
      title="新打印设计器(实验)"
      sub-title="src/designer · TypeScript + Vue 3 + 不可变 schema"
      style="padding: 0 0 16px 0"
    />

    <a-space style="margin-bottom: 12px" wrap>
      <a-popconfirm
        title="重置当前模板?"
        ok-text="重置"
        cancel-text="取消"
        @confirm="onReset"
      >
        <a-button danger>重置</a-button>
      </a-popconfirm>
    </a-space>

    <div class="designer-area">
      <PrintDesigner
        ref="designerRef"
        :initial-template="initialTemplate"
        @json-import-error="onJsonError"
      />
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { message } from "ant-design-vue";
import {
  PrintDesigner,
  createTemplate,
  createText,
  createTable,
  type Template,
} from "../../designer";

defineOptions({ name: "printNewDesigner" });

const designerRef = ref<InstanceType<typeof PrintDesigner> | null>(null);

const initialTemplate: Template = createTemplate({
  elements: [
    createText({
      x: 75,
      y: 20,
      w: 60,
      h: 10,
      text: "销售单",
      fontSize: 18,
      fontWeight: "bold",
      align: "center",
    }),
    createText({ x: 20, y: 40, w: 60, h: 6, text: "客户:示例客户" }),
    createText({ x: 20, y: 50, w: 60, h: 6, text: "日期:2026-10-13" }),
    createTable({ x: 20, y: 60, w: 170, h: 80, dataPath: "rows" }),
  ],
});

const printData = {
  rows: [
    { name: "商品 A", qty: 2, price: 100 },
    { name: "商品 B", qty: 1, price: 250 },
    { name: "商品 C", qty: 3, price: 80 },
    { name: "商品 D", qty: 1, price: 500 },
    { name: "商品 E", qty: 4, price: 60 },
    { name: "商品 F", qty: 2, price: 180 },
    { name: "商品 G", qty: 5, price: 30 },
    { name: "商品 H", qty: 1, price: 999 },
  ],
};

function onJsonError() {
  message.error("JSON 格式不合法(需要 version=1.0 + paper + elements)");
}

function onReset() {
  if (!designerRef.value) return;
  designerRef.value.designer.load(createTemplate());
  message.info("已重置");
}
</script>

<style scoped>
.designer-area {
  height: 720px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
}
</style>
