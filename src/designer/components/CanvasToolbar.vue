<!--
  画布顶部全局工具条。

  风格参考富文本编辑器:水平紧凑、按钮小、有 hover/active 状态、分组。
  不依赖 antd 组件,纯 HTML + 内联 SVG,贴近原生工具条视觉。

  功能:
  - ↶ 撤销 / ↷ 重做(history: add/remove/setPaper/load 入栈,update 不入栈)
  - 缩放下拉:50/75/100/125/150/200%
  - ⊞ 网格(5mm 点阵背景)
  - 6 个对齐:左/中/右 + 顶/中/底(选中元素时启用,基于 paper 边界)
  - 🗑 清空全部(带 confirm)
-->
<template>
  <div class="ctb">
    <div class="ctb-group">
      <button
        class="ctb-btn primary"
        title="打印 (Ctrl+P)"
        @click="$emit('print')"
      ><span v-html="printIcon" /></button>
      <button
        class="ctb-btn"
        :disabled="!canUndo"
        title="撤销 (Ctrl+Z)"
        @click="$emit('undo')"
      ><span v-html="undoIcon" /></button>
      <button
        class="ctb-btn"
        :disabled="!canRedo"
        title="重做 (Ctrl+Y)"
        @click="$emit('redo')"
      ><span v-html="redoIcon" /></button>
    </div>

    <span class="ctb-sep" />

    <div class="ctb-group">
      <button
        class="ctb-btn"
        :class="{ active: showGrid }"
        title="网格"
        @click="$emit('toggleGrid')"
      ><span v-html="gridIcon" /></button>
    </div>

    <span class="ctb-sep" />

    <div class="ctb-group">
      <button
        class="ctb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '水平左对齐' : '水平左对齐(未选中)'"
        @click="$emit('alignH', 'left')"
      ><span v-html="alignLeftIcon" /></button>
      <button
        class="ctb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '水平居中' : '水平居中(未选中)'"
        @click="$emit('alignH', 'center')"
      ><span v-html="alignCenterHIcon" /></button>
      <button
        class="ctb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '水平右对齐' : '水平右对齐(未选中)'"
        @click="$emit('alignH', 'right')"
      ><span v-html="alignRightIcon" /></button>
      <span class="ctb-mini-sep" />
      <button
        class="ctb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '垂直顶对齐' : '垂直顶对齐(未选中)'"
        @click="$emit('alignV', 'top')"
      ><span v-html="alignTopIcon" /></button>
      <button
        class="ctb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '垂直居中' : '垂直居中(未选中)'"
        @click="$emit('alignV', 'middle')"
      ><span v-html="alignCenterVIcon" /></button>
      <button
        class="ctb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '垂直底对齐' : '垂直底对齐(未选中)'"
        @click="$emit('alignV', 'bottom')"
      ><span v-html="alignBottomIcon" /></button>
    </div>

    <span class="ctb-sep" />

    <div class="ctb-group">
      <button
        class="ctb-btn danger"
        title="清空全部"
        @click="onClear"
      ><span v-html="trashIcon" /></button>
    </div>

    <div class="ctb-spacer" />

    <div class="ctb-group">
      <span class="ctb-label">缩放</span>
      <select
        class="ctb-select"
        :value="zoomPercent"
        title="画布缩放"
        @change="onZoomChange"
      >
        <option v-for="z in ZOOM_OPTIONS" :key="z" :value="z">{{ z }}%</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HorizontalAlign, VerticalAlign } from '../core/align'

const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 200] as const

const props = defineProps<{
  canUndo: boolean
  canRedo: boolean
  showGrid: boolean
  hasSelection: boolean
  zoom: number
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  toggleGrid: []
  alignH: [mode: HorizontalAlign]
  alignV: [mode: VerticalAlign]
  clear: []
  print: []
  setZoom: [z: number]
}>()

const zoomPercent = computed(() => Math.round((props.zoom ?? 1) * 100))

function onZoomChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  emit('setZoom', v / 100)
}

function onClear() {
  if (window.confirm('清空全部元素?此操作可撤销。')) {
    emit('clear')
  }
}

// 内联 SVG icons(用 heroicons-style 1.5px stroke),避免拉新依赖
const stroke = 'currentColor'
const sw = 1.5
const printIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`
const undoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>`
const redoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>`
const gridIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`
const alignLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`
const alignCenterHIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`
const alignRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>`
const alignTopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="21"/><line x1="12" y1="3" x2="12" y2="15"/><line x1="18" y1="3" x2="18" y2="18"/></svg>`
const alignCenterVIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="21"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="18" y1="6" x2="18" y2="21"/></svg>`
const alignBottomIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="21"/><line x1="12" y1="9" x2="12" y2="21"/><line x1="18" y1="6" x2="18" y2="21"/></svg>`
const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`
</script>

<style scoped>
.ctb {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  height: 36px;
  padding: 0 8px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  gap: 4px;
  user-select: none;
}
.ctb-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
.ctb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #444;
  cursor: pointer;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.ctb-btn:hover:not(:disabled) {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.ctb-btn.active {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #1677ff;
}
.ctb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ctb-btn.danger:hover:not(:disabled) {
  background: #fff1f0;
  border-color: #ffa39e;
  color: #ff4d4f;
}
.ctb-btn.primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}
.ctb-btn.primary:hover:not(:disabled) {
  background: #4096ff;
  border-color: #4096ff;
  color: #fff;
}
.ctb-sep {
  width: 1px;
  height: 18px;
  background: #e0e0e0;
  margin: 0 4px;
}
.ctb-mini-sep {
  width: 1px;
  height: 16px;
  background: #e8e8e8;
  margin: 0 2px;
}
.ctb-spacer {
  flex: 1;
}
.ctb-label {
  font-size: 12px;
  color: #666;
  margin-right: 4px;
}
.ctb-select {
  height: 24px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  outline: none;
}
.ctb-select:hover {
  border-color: #1677ff;
}
.ctb-select:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}
</style>
