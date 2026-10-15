<!--
  PreviewModal — 打印预览弹窗(仿 Vue-Print-Designer PreviewModal.vue)。

  结构:
  - Header:标题 + 中间 zoom 控件 + 关闭按钮
  - Content:.paper 内含样式 (v-html 渲染)
  - Footer:打印 / PDF / 图片 / HTML / 关闭 按钮
-->
<template>
  <Teleport :to="teleportTarget">
    <div
      v-if="visible"
      class="pm-root"
      @click.self="$emit('update:visible', false)"
    >
      <div class="pm-card">
        <!-- Header -->
        <div class="pm-header">
          <h3 class="pm-title">打印预览</h3>
          <div class="pm-zoom">
            <button
              class="pm-zbtn"
              title="缩小"
              :disabled="zoom <= 20"
              @click="zoomOut"
            ><span v-html="zoomOutIcon" /></button>
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              :value="zoom"
              class="pm-range"
              @input="onZoom"
            />
            <button
              class="pm-zbtn"
              title="放大"
              :disabled="zoom >= 200"
              @click="zoomIn"
            ><span v-html="zoomInIcon" /></button>
            <span class="pm-zoom-label">{{ zoom }}%</span>
          </div>
          <button
            class="pm-x"
            title="关闭"
            @click="$emit('update:visible', false)"
          ><span v-html="closeIcon" /></button>
        </div>

        <!-- Content -->
        <div ref="wrapperRef" class="pm-body">
          <div
            ref="contentRef"
            class="pm-content"
            :style="contentStyle"
            v-html="htmlContent"
          ></div>
        </div>

        <!-- Footer -->
        <div class="pm-footer">
          <button
            class="pm-btn pm-btn-primary"
            title="打印"
            @click="$emit('print')"
          ><span v-html="printIcon" />打印</button>
          <button
            class="pm-btn pm-btn-primary"
            title="导出 PDF"
            @click="$emit('exportPdf')"
          ><span v-html="pdfIcon" />导出 PDF</button>
          <button
            class="pm-btn pm-btn-primary"
            title="导出图片"
            @click="$emit('exportImages')"
          ><span v-html="imageIcon" />导出图片</button>
          <button
            class="pm-btn pm-btn-primary"
            title="导出 HTML"
            @click="$emit('exportHtml')"
          ><span v-html="htmlIcon" />导出 HTML</button>
          <button
            class="pm-btn"
            title="关闭"
            @click="$emit('update:visible', false)"
          ><span v-html="closeIcon" />关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'

const props = defineProps<{
  visible: boolean
  /** 渲染好的内层 HTML(只含 .paper 区块) */
  htmlContent: string
  /** 画布内容宽度(px),用于设置内容层固定宽度 */
  width: number
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  print: []
  exportPdf: []
  exportImages: []
  exportHtml: []
}>()

// Teleport 目标:designer root(优先)/ body(兜底)
const designerRoot = inject<Ref<HTMLElement | null>>('designer-root', ref(null))
const teleportTarget = computed(() => designerRoot.value ?? 'body')

const wrapperRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const zoom = ref(100)

watch(() => props.visible, (v) => {
  if (v) zoom.value = 100
})

const contentStyle = computed(() => ({
  width: `${props.width}px`,
  zoom: zoom.value / 100,
}))

function onZoom(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) zoom.value = v
}
function zoomIn() { zoom.value = Math.min(200, zoom.value + 10) }
function zoomOut() { zoom.value = Math.max(20, zoom.value - 10) }

// 暴露给父组件:导出 PDF / 图片时取真实 .paper 节点
defineExpose({
  getPages(): HTMLElement[] {
    return contentRef.value
      ? (Array.from(contentRef.value.querySelectorAll('.paper')) as HTMLElement[])
      : []
  },
})

// ===== icons =====
const stroke = 'currentColor'
const sw = 1.5
const closeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
const zoomInIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>`
const zoomOutIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>`
const printIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>`
const pdfIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
const imageIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`
const htmlIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
</script>

<style scoped>
.pm-root {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}
.pm-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  position: relative;
}
.pm-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
}
.pm-zoom {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}
.pm-zbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: #555;
  cursor: pointer;
}
.pm-zbtn:hover:not(:disabled) {
  background: #f5f5f5;
  color: #1677ff;
}
.pm-zbtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pm-range {
  width: 120px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 4px;
  appearance: none;
  cursor: pointer;
}
.pm-range::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #1677ff;
  border-radius: 50%;
  cursor: pointer;
}
.pm-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #1677ff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}
.pm-zoom-label {
  font-size: 12px;
  color: #555;
  min-width: 36px;
  text-align: right;
}
.pm-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 0;
  border-radius: 50%;
  color: #999;
  cursor: pointer;
}
.pm-x:hover {
  background: #f5f5f5;
  color: #333;
}
.pm-body {
  flex: 1;
  overflow: auto;
  background: #f0f0f0;
  padding: 24px;
}
.pm-content {
  margin: 0 auto;
  padding-bottom: 16px;
  /* 内部用 zoom 缩放 */
}
.pm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}
.pm-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: #fff;
  color: #555;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms, color 120ms, border-color 120ms;
}
.pm-btn:hover {
  background: #f5f5f5;
  color: #333;
  border-color: #91caff;
}
.pm-btn-primary {
  background: #1677ff;
  color: #fff;
  border-color: #1677ff;
}
.pm-btn-primary:hover {
  background: #4096ff;
  color: #fff;
  border-color: #4096ff;
}

/* 预览区内的 .paper 不需要阴影 / 转换,走普通流。 */
.pm-content :deep(.paper) {
  position: relative;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  margin-bottom: 16px;
}
/* 预览模式下,所有元素强制默认光标 */
.pm-content :deep(*) {
  cursor: default !important;
}
</style>