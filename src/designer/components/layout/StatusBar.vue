<!--
  StatusBar — 底部状态栏。

  左侧(优先级递减):
    1. 多选时:绿点 + "已选中 N 个元素"
    2. 单选时:蓝点 + 类型名 + X/Y/WxH (mm)
    3. 无选中:绿点 + "就绪"
  右侧:缩放百分比
-->
<template>
  <footer class="status-bar">
    <div class="status-left">
      <template v-if="multiCount > 1">
        <span class="dot dot-blue" />
        <span>已选中 {{ multiCount }} 个元素</span>
      </template>
      <template v-else-if="selected">
        <span class="dot dot-blue" />
        <span class="el-type">{{ typeLabel }}</span>
        <span class="el-pos"
          >X: {{ fmt(selected.x) }}mm &nbsp; Y: {{ fmt(selected.y) }}mm</span
        >
        <span class="el-size"
          >{{ fmt(selected.w) }} × {{ fmt(selected.h) }} mm</span
        >
      </template>
      <template v-else>
        <span class="dot dot-green" />
        <span>就绪</span>
      </template>
    </div>
    <div class="status-right">
      <span>缩放 {{ Math.round(zoom * 100) }}%</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Element, ElementType } from '../../core/types'

const props = defineProps<{
  /** 当前选中的元素(单选,无选中传 null) */
  selected: Element | null
  /** 多选数量(单选 = 0 或 1,多选 ≥ 2) */
  multiCount: number
  /** 当前缩放(1 = 100%) */
  zoom: number
}>()

const TYPE_LABELS: Record<ElementType, string> = {
  text: '文本',
  image: '图片',
  table: '表格',
  line: '线条',
  pagenum: '页码',
  barcode: '条形码',
  qrcode: '二维码',
  multilabel: '多标签',
  rect: '矩形',
  circle: '椭圆',
}

const typeLabel = computed(() => {
  const t = props.selected?.type
  return t ? (TYPE_LABELS[t] ?? t) : ''
})

/** mm 数字 → 紧凑显示:整数不带小数,1 位小数带 .0 去掉 */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const v = Number(n.toFixed(1))
  return Number.isInteger(v) ? v.toString() : v.toString()
}
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 12px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
  user-select: none;
}
.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-green {
  background: #52c41a;
}
.dot-blue {
  background: #1677ff;
}
.el-type {
  color: #374151;
  font-weight: 500;
}
.el-pos,
.el-size {
  color: #9ca3af;
}
</style>
