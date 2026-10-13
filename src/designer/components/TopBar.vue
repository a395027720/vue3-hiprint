<!--
  顶栏(品牌 + 元素类型选择 + 保存)。

  元素类型图标网格(文本/图片/表格/线条)点击触发 add 事件。
  风格参考 Vue-Print-Designer:logo+品牌左对齐,元素居中,保存按钮右对齐。
-->
<template>
  <header class="topbar">
    <div class="topbar-brand">
      <printer-outlined class="brand-icon" />
      <span class="brand-text">打印设计器</span>
    </div>

    <div class="topbar-elements">
      <div class="elements-inner">
        <button
          class="el-btn el-btn-custom"
          title="自定义(预留)"
          @click="onCustom"
        ><span v-html="customIcon" /><span class="el-label">自定义</span></button>

        <div class="vsep" />

        <div class="elements-scroll">
          <div class="elements-row">
            <template v-for="(group, gi) in elementGroups" :key="gi">
              <button
                v-for="item in group"
                :key="item.type"
                class="el-btn"
                :title="`${item.label}(可拖拽到画布)`"
                draggable="true"
                @click="$emit('add', item.type)"
                @dragstart="onDragStart($event, item.type)"
              >
                <span class="el-icon" v-html="item.icon" />
                <span class="el-label">{{ item.label }}</span>
              </button>
              <div v-if="gi < elementGroups.length - 1" class="vsep" />
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="topbar-actions">
      <div ref="saveMenuRef" class="save-group">
        <button
          class="save-btn"
          :disabled="!dirty"
          @click="$emit('save')"
        >
          <save-outlined /> 保存
        </button>
        <button
          class="save-arrow"
          :disabled="!dirty"
          title="更多保存操作"
          @click="saveMenuOpen = !saveMenuOpen"
        ><down-outlined /></button>
        <div v-if="saveMenuOpen" class="save-menu">
          <button class="save-menu-item" @click="onPick('viewJson')">
            <code-outlined /> 查看 JSON
          </button>
          <button class="save-menu-item" @click="onPick('exportJson')">
            <download-outlined /> 导出 JSON
          </button>
          <div class="save-menu-sep" />
          <button class="save-menu-item" @click="onPick('print')">
            <printer-outlined /> 打印
          </button>
          <button class="save-menu-item" @click="onPick('printPreview')">
            <eye-outlined /> 打印预览
          </button>
          <button class="save-menu-item" @click="onPick('exportPdf')">
            <file-pdf-outlined /> 导出 PDF
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ElementType } from '../core/types'

defineProps<{
  /** 当前模板是否有未保存修改(决定保存按钮是否可用) */
  dirty?: boolean
}>()

const emit = defineEmits<{
  add: [type: ElementType]
  custom: []
  save: []
  viewJson: []
  exportJson: []
  print: []
  printPreview: []
  exportPdf: []
}>()

const saveMenuOpen = ref(false)
const saveMenuRef = ref<HTMLElement | null>(null)

function onPick(action: 'viewJson' | 'exportJson' | 'print' | 'printPreview' | 'exportPdf') {
  saveMenuOpen.value = false
  if (action === 'viewJson') emit('viewJson')
  else if (action === 'exportJson') emit('exportJson')
  else if (action === 'print') emit('print')
  else if (action === 'printPreview') emit('printPreview')
  else emit('exportPdf')
}

function onDragStart(e: DragEvent, type: ElementType) {
  e.dataTransfer?.setData('text/plain', type)
  e.dataTransfer?.setData('application/x-designer-element', type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}

function onDocumentMouseDown(e: MouseEvent) {
  if (!saveMenuOpen.value) return
  if (saveMenuRef.value && !saveMenuRef.value.contains(e.target as Node)) {
    saveMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMouseDown))

interface PaletteItem {
  type: ElementType
  label: string
  icon: string
}

const stroke = 'currentColor'
const sw = 1.6
// 双向箭头(自定义按钮)
const customIcon = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="m7 20l-5-5l5-5l1.4 1.425L5.825 14H13v2H5.825L8.4 18.575zm10-6l-1.4-1.425L18.175 10H11V8h7.175L15.6 5.425L17 4l5 5z"/></svg>`

const elementGroups: PaletteItem[][] = [
  // 组 1:文本类
  [
    {
      type: 'text', label: '文本',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 20V7H2V4h13v3h-5v13zm9 0v-8h-3V9h9v3h-3v8z"/></svg>`,
    },
    {
      type: 'image', label: '图片',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z"/></svg>`,
    },
    {
      type: 'pagenum', label: '页码',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="m6 20l1-4H3l.5-2h4l1-4h-4L5 8h4l1-4h2l-1 4h4l1-4h2l-1 4h4l-.5 2h-4l-1 4h4l-.5 2h-4l-1 4h-2l1-4H9l-1 4zm3.5-6h4l1-4h-4z"/></svg>`,
    },
  ],
  // 组 2:数据/码类
  [
    {
      type: 'table', label: '表格',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 8V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v3zm2 13q-.825 0-1.412-.587T3 19v-9h4.5v11zm11.5 0V10H21v9q0 .825-.587 1.413T19 21zm-7 0V10h5v11z"/></svg>`,
    },
    {
      type: 'barcode', label: '条形码',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M1 19V5h2v14zm3 0V5h2v14zm3 0V5h1v14zm3 0V5h2v14zm3 0V5h3v14zm4 0V5h1v14zm3 0V5h3v14z"/></svg>`,
    },
    {
      type: 'qrcode', label: '二维码',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 11V3h8v8zm2-2h4V5H5zM3 21v-8h8v8zm2-2h4v-4H5zm8-8V3h8v8zm2-2h4V5h-4zm4 12v-2h2v2zm-6-6v-2h2v2zm2 2v-2h2v2zm-2 2v-2h2v2zm2 2v-2h2v2zm2-2v-2h2v2zm0-4v-2h2v2zm2 2v-2h2v2z"/></svg>`,
    },
    {
      type: 'multilabel', label: '多标签',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 11V3h8v8zm0 10v-8h8v8zm10-10V3h8v8zm0 10v-8h8v8z"/></svg>`,
    },
  ],
  // 组 3:形状类
  [
    {
      type: 'line', label: '直线',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 13v-2h16v2z"/></svg>`,
    },
    {
      type: 'rect', label: '矩形',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5z"/></svg>`,
    },
    {
      type: 'circle', label: '圆形',
      icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20"/></svg>`,
    },
  ],
]

function onCustom() {
  // 自定义元素(预留),消费方可在 PrintDesigner 监听 'custom' 事件。
  // MVP:仅做占位,实际不创建元素。
  emit('custom')
}
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  height: 64px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 0 0 auto;
}
.brand-icon {
  font-size: 20px;
  color: #1677ff;
}
.brand-text {
  white-space: nowrap;
}

/* 元素区:整体居中,内部 max-w-860,自定义按钮 + 滚动元素组 */
.topbar-elements {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  justify-content: center;
  overflow: hidden;
}
.elements-inner {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 860px;
  justify-content: center;
  gap: 0;
  min-width: 0;
}
.elements-scroll {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.elements-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.elements-row {
  display: flex;
  width: max-content;
  min-width: max-content;
  align-items: center;
  gap: 6px;
  padding-right: 4px;
}
.vsep {
  flex: 0 0 auto;
  width: 1px;
  height: 32px;
  background: #e0e0e0;
  margin: 0 8px;
}
.el-btn {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 48px;
  height: 48px;
  padding: 0;
  background: #fff;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #595959;
  cursor: move;
  font-size: 10px;
  line-height: 1.2;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.el-btn:hover {
  background: #f5f5f5;
  color: #1677ff;
}
.el-btn-custom {
  cursor: pointer;
}
.el-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.el-label {
  width: 100%;
  padding: 0 2px;
  text-align: center;
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.save-group {
  position: relative;
  display: inline-flex;
  align-items: stretch;
}
.save-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #1677ff;
  border: 1px solid #1677ff;
  border-radius: 4px 0 0 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms;
}
.save-btn:hover:not(:disabled) {
  background: #4096ff;
  border-color: #4096ff;
}
.save-btn:disabled {
  background: #f0f0f0;
  border-color: #f0f0f0;
  color: #bfbfbf;
  cursor: not-allowed;
}
.save-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  padding: 0;
  background: #1677ff;
  border: 1px solid #1677ff;
  border-left: 1px solid #69b1ff;
  border-radius: 0 4px 4px 0;
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  transition: background 120ms;
}
.save-arrow:hover:not(:disabled) {
  background: #4096ff;
  border-color: #4096ff;
}
.save-arrow:disabled {
  background: #f0f0f0;
  border-color: #f0f0f0;
  color: #bfbfbf;
  cursor: not-allowed;
  border-left-color: #f0f0f0;
}
.save-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 160px;
  padding: 4px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.save-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #333;
  background: transparent;
  border: 0;
  border-radius: 3px;
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.save-menu-item:hover {
  background: #f5f5f5;
  color: #1677ff;
}
.save-menu-sep {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}
</style>
