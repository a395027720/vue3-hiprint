<!--
  ElementRenderer — 元素渲染器路由壳。

  按 element.type 分发到 elements/ 下对应的元素组件:
  TextElement / ImageElement / TableElement / LineElement / PageNumElement /
  BarcodeElement / QrcodeElement / MultiLabelElement / RectElement / CircleElement。

  与 Vue-Print-Designer 对齐:每个 type 独立文件,router 壳只负责分发。
-->
<template>
  <TextElement v-if="element.type === 'text'" :element="element" />
  <ImageElement v-else-if="element.type === 'image'" :element="element" />
  <TableElement
    v-else-if="element.type === 'table'"
    :element="element"
    :preview-data="previewData"
  />
  <LineElement v-else-if="element.type === 'line'" :element="element" />
  <PageNumElement v-else-if="element.type === 'pagenum'" :element="element" />
  <BarcodeElement v-else-if="element.type === 'barcode'" :element="element" />
  <QrcodeElement v-else-if="element.type === 'qrcode'" :element="element" />
  <MultiLabelElement v-else-if="element.type === 'multilabel'" :element="element" />
  <RectElement v-else-if="element.type === 'rect'" :element="element" />
  <CircleElement v-else-if="element.type === 'circle'" :element="element" />
</template>

<script setup lang="ts">
import type { Element } from '../../core/types'
import TextElement from './TextElement.vue'
import ImageElement from './ImageElement.vue'
import TableElement from './TableElement.vue'
import LineElement from './LineElement.vue'
import PageNumElement from './PageNumElement.vue'
import BarcodeElement from './BarcodeElement.vue'
import QrcodeElement from './QrcodeElement.vue'
import MultiLabelElement from './MultiLabelElement.vue'
import RectElement from './RectElement.vue'
import CircleElement from './CircleElement.vue'

defineProps<{
  element: Element
  /** table 预览用的示例数据 */
  previewData?: Record<string, unknown>[]
}>()
</script>