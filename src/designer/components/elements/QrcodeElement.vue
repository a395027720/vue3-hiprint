<!--
  QrcodeElement — 二维码(MVP:伪棋盘示意,真实渲染由 hiprint 引擎处理)。
-->
<template>
  <div class="el-qrcode" :style="boxStyle">
    <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size">
      <rect
        v-for="(cell, i) in cells"
        :key="i"
        :x="cell.x"
        :y="cell.y"
        :width="cell.size"
        :height="cell.size"
        fill="#000"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QrcodeElement } from '../../core/types'
import { mmToPx } from '../../core/render'

const props = defineProps<{
  element: QrcodeElement
}>()

const boxStyle = {
  background: '#fff',
  display: 'flex',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}

const size = computed(() => mmToPx(Math.min(props.element.w, props.element.h)))

const cells = computed<Array<{ x: number; y: number; size: number }>>(() => {
  if (size.value === 0) return []
  const n = 21
  const cell = size.value / n
  const out: Array<{ x: number; y: number; size: number }> = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if ((x * 7 + y * 13 + x * y) % 3 === 0) {
        out.push({ x: x * cell, y: y * cell, size: cell })
      }
    }
  }
  return out
})
</script>