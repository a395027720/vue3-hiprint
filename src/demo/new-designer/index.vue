<!--
 * @Description: 新打印设计器(实验)
 * @Author: GaoJQiang
 * @Date: 2026-10-13 15:28:09
 * @LastEditors: GaoJQiang
 * @LastEditTime: 2026-10-13 15:31:35
-->
<template>
  <a-card>
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
  pages: [
    {
      id: "p_demo",
      elements: [
        createText({
          x: 75,
          y: 20,
          w: 60,
          h: 12,
          text: "销售单",
          fontSize: 6.4,
          fontWeight: "bold",
          align: "center",
        }),
        createText({ x: 20, y: 40, w: 60, h: 6, text: "客户:示例客户" }),
        createText({ x: 20, y: 50, w: 60, h: 6, text: "日期:2026-10-13" }),
        createTable({ x: 20, y: 60, w: 170, h: 80, dataPath: "rows" }),
      ],
    },
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
