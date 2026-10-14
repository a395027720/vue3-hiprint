<!--
  MultiLabelElement — 多标签(每行多列,常用于标签打印)。
-->
<template>
  <div class="el-multilabel" :style="boxStyle">
    <div
      v-for="(l, i) in element.labels.slice(0, element.cols * 2)"
      :key="i"
      class="label-chip"
      :style="chipStyle(l)"
    >{{ l.text }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MultiLabelElement } from '../../core/types'
import { mmToPx } from '../../core/render'

const props = defineProps<{
  element: MultiLabelElement
}>()

const gap = 2

const boxStyle = computed(() => {
  const cellW = (mmToPx(props.element.w) - gap * (props.element.cols - 1)) / props.element.cols
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${props.element.cols}, ${cellW}px)`,
    gap: `${gap}px`,
  }
})

function chipStyle(l: { color?: string }) {
  return {
    background: l.color ?? '#f0f7ff',
    border: '1px solid #91caff',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: (props.element.fontSize ?? 12) + 'pt',
    color: props.element.color ?? '#333',
    height: '18px',
  }
}
</script>