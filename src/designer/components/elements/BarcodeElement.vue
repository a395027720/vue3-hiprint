<!--
  BarcodeElement — 条形码(MVP:横线示意,真实渲染由 hiprint 引擎处理)。
-->
<template>
  <div class="el-barcode" :style="boxStyle">
    <svg :viewBox="`0 0 ${element.w} ${element.h}`" :width="mmToPx(element.w)" :height="mmToPx(element.h * 0.75)">
      <rect
        v-for="(bar, i) in bars"
        :key="i"
        :x="bar.x"
        y="0"
        :width="bar.w"
        :height="mmToPx(element.h * 0.75)"
        fill="#000"
      />
    </svg>
    <div style="font-size: 10px; color: #333; margin-top: 2px">{{ element.value }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BarcodeElement } from '../../core/types'
import { mmToPx } from '../../core/render'

const props = defineProps<{
  element: BarcodeElement
}>()

const boxStyle = {
  background: '#fff',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}

const bars = computed<Array<{ x: number; w: number }>>(() => {
  const w = mmToPx(props.element.w)
  const count = Math.max(20, Math.floor(w / 3))
  const out: Array<{ x: number; w: number }> = []
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) continue
    out.push({ x: (i / count) * w, w: ((i * 7) % 4) + 1 })
  }
  return out
})
</script>