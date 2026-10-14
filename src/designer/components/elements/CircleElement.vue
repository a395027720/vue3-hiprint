<!--
  CircleElement — 圆形(fill / 边框)。
-->
<template>
  <div class="el-circle" :style="style"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CircleElement } from '../../core/types'
import { sideCss } from '../../core/elementStyle'

const props = defineProps<{
  element: CircleElement
}>()

const style = computed(() => {
  const e = props.element
  return {
    background: e.fill ?? 'transparent',
    borderRadius: '50%',
    boxSizing: 'border-box',
    borderTop: sideCss(e, 'top'),
    borderRight: sideCss(e, 'right'),
    borderBottom: sideCss(e, 'bottom'),
    borderLeft: sideCss(e, 'left'),
  }
})
</script>