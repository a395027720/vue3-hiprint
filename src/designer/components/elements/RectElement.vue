<!--
  RectElement — 矩形(fill / 边框 / 圆角)。
-->
<template>
  <div class="el-rect" :style="style"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RectElement } from '../../core/types'
import { sideCss } from '../../core/elementStyle'

const props = defineProps<{
  element: RectElement
}>()

const style = computed(() => {
  const e = props.element
  return {
    background: e.fill ?? 'transparent',
    boxSizing: 'border-box',
    borderTop: sideCss(e, 'top'),
    borderRight: sideCss(e, 'right'),
    borderBottom: sideCss(e, 'bottom'),
    borderLeft: sideCss(e, 'left'),
    borderRadius: e.borderRadius ? e.borderRadius + 'mm' : undefined,
  }
})
</script>