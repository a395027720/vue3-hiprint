<template>
  <aside class="palette">
    <div class="palette-title">元素</div>
    <div
      v-for="item in items"
      :key="item.type"
      class="palette-item"
      draggable="true"
      @click="$emit('add', item.type)"
      @dragstart="onDragStart($event, item.type)"
    >
      <span class="palette-icon">{{ item.icon }}</span>
      <span class="palette-label">{{ item.label }}</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ElementType } from '../core/types'

defineEmits<{
  /** 点击或拖入画布时触发 */
  add: [type: ElementType]
}>()

interface PaletteItem {
  type: ElementType
  label: string
  icon: string
}

const items: PaletteItem[] = [
  { type: 'text', label: '文本', icon: 'T' },
  { type: 'image', label: '图片', icon: '▢' },
  { type: 'table', label: '表格', icon: '⊞' },
  { type: 'line', label: '线条', icon: '—' },
]

function onDragStart(e: DragEvent, type: ElementType) {
  e.dataTransfer?.setData('text/plain', type)
}
</script>

<style scoped>
.palette {
  width: 160px;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  padding: 16px 8px;
  flex-shrink: 0;
}
.palette-title {
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 12px;
  padding: 0 8px;
  color: #333;
}
.palette-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  transition: all 0.15s;
}
.palette-item:hover {
  border-color: #1890ff;
  background: #e6f7ff;
}
.palette-item:active { cursor: grabbing; }
.palette-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-right: 10px;
  font-weight: bold;
  color: #555;
}
.palette-label {
  font-size: 13px;
  color: #333;
}
</style>
