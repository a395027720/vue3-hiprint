<!--
  文本格式 + 纸张 + 缩放工具条。

  风格参考 Vue-Print-Designer:水平、紧凑、按钮小、hover 蓝色高亮、
  active 蓝色实心,组与组之间用竖线分隔。
  始终可用,无对应元素时灰色禁用。
-->
<template>
  <div class="ftb">
    <button
      class="ftb-scroll"
      :disabled="!canScrollLeft"
      title="向左滚动工具栏"
      aria-label="向左滚动工具栏"
      @click="scrollBy(-1)"
    ><span v-html="chevronLeftIcon" /></button>

    <div ref="scrollerRef" class="ftb-main" @scroll="updateScrollState">
    <div class="ftb-group">
      <div ref="printMenuRef" class="ftb-dropdown">
        <button
          class="ftb-btn"
          :class="{ active: printMenuOpen }"
          title="打印"
          @click="printMenuOpen = !printMenuOpen"
        >
          <printer-outlined />
          <down-outlined style="font-size: 10px; margin-left: 2px" />
        </button>
        <div v-if="printMenuOpen" class="ftb-menu">
          <button class="ftb-menu-item" @click="$emit('printPreview')">
            <eye-outlined /> 打印预览
          </button>
          <button class="ftb-menu-item" @click="$emit('print')">
            <printer-outlined /> 打印
          </button>
        </div>
      </div>
      <button
        class="ftb-btn"
        :disabled="!canUndo"
        title="撤销 (Ctrl+Z)"
        @click="$emit('undo')"
      ><span v-html="undoIcon" /></button>
      <button
        class="ftb-btn"
        :disabled="!canRedo"
        title="重做 (Ctrl+Y)"
        @click="$emit('redo')"
      ><span v-html="redoIcon" /></button>
    </div>

    <span class="ftb-sep" />

    <div class="ftb-group">
      <button
        class="ftb-btn"
        :class="{ active: showGrid }"
        title="网格"
        @click="$emit('toggleGrid')"
      ><span v-html="gridIcon" /></button>
      <button
        class="ftb-btn"
        :class="{ active: panMode }"
        title="手型拖动(空格临时)"
        @click="$emit('togglePan')"
      ><drag-outlined v-if="!panMode" /><drag-outlined v-else style="color: #1677ff" /></button>
    </div>

    <span class="ftb-sep" />

    <div class="ftb-group">
      <button
        class="ftb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '水平左对齐' : '水平左对齐(未选中)'"
        @click="$emit('alignH', 'left')"
      ><span v-html="alignLeftIcon" /></button>
      <button
        class="ftb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '水平居中' : '水平居中(未选中)'"
        @click="$emit('alignH', 'center')"
      ><span v-html="alignCenterHIcon" /></button>
      <button
        class="ftb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '水平右对齐' : '水平右对齐(未选中)'"
        @click="$emit('alignH', 'right')"
      ><span v-html="alignRightIcon" /></button>
      <span class="ftb-mini-sep" />
      <button
        class="ftb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '垂直顶对齐' : '垂直顶对齐(未选中)'"
        @click="$emit('alignV', 'top')"
      ><vertical-align-top-outlined /></button>
      <button
        class="ftb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '垂直居中' : '垂直居中(未选中)'"
        @click="$emit('alignV', 'middle')"
      ><vertical-align-middle-outlined /></button>
      <button
        class="ftb-btn"
        :disabled="!hasSelection"
        :title="hasSelection ? '垂直底对齐' : '垂直底对齐(未选中)'"
        @click="$emit('alignV', 'bottom')"
      ><vertical-align-bottom-outlined /></button>
    </div>

    <span class="ftb-sep" />

    <div class="ftb-group">
      <select
        class="ftb-select"
        :value="fontFamily ?? ''"
        :disabled="!isText"
        title="字体"
        @change="onFontFamilyChange"
      >
        <option value="">默认</option>
        <option v-for="f in FONT_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
      <span class="ftb-mini-sep" />
      <span class="ftb-label">字号</span>
      <button
        class="ftb-step"
        :disabled="!isText"
        title="减小字号"
        @click="$emit('fontSizeStep', -1)"
      >−</button>
      <input
        class="ftb-num"
        type="number"
        :value="fontSize ?? ''"
        :disabled="!isText"
        min="6"
        max="96"
        title="字号 (pt)"
        @change="onFontSizeChange"
      />
      <button
        class="ftb-step"
        :disabled="!isText"
        title="增大字号"
        @click="$emit('fontSizeStep', 1)"
      >+</button>
    </div>

    <span class="ftb-sep" />

    <div class="ftb-group">
      <button
        class="ftb-btn"
        :class="{ active: boldActive }"
        :disabled="!isText"
        title="粗体 (Ctrl+B)"
        @click="$emit('toggleBold')"
      ><b>B</b></button>
      <button
        class="ftb-btn"
        :class="{ active: italicActive }"
        :disabled="!isText"
        title="斜体 (Ctrl+I)"
        @click="$emit('toggleItalic')"
      ><i>I</i></button>
      <button
        class="ftb-btn"
        :class="{ active: underlineActive }"
        :disabled="!isText"
        title="下划线 (Ctrl+U)"
        @click="$emit('toggleUnderline')"
      ><u>U</u></button>
      <button
        class="ftb-btn"
        :class="{ active: strikeActive }"
        :disabled="!isText"
        title="删除线"
        @click="$emit('toggleStrike')"
      ><s>S</s></button>
      <span class="ftb-mini-sep" />
      <button
        class="ftb-btn"
        :class="{ active: listType === 'ul' }"
        :disabled="!isText"
        title="无序列表"
        @click="$emit('toggleList', listType === 'ul' ? 'none' : 'ul')"
      ><unordered-list-outlined /></button>
      <button
        class="ftb-btn"
        :class="{ active: listType === 'ol' }"
        :disabled="!isText"
        title="有序列表"
        @click="$emit('toggleList', listType === 'ol' ? 'none' : 'ol')"
      ><ordered-list-outlined /></button>
      <label
        class="ftb-color"
        :class="{ disabled: !isText }"
        title="字体颜色"
      >
        <font-colors-outlined />
        <span class="ftb-color-swatch" :style="{ background: textColor ?? '#000' }" />
        <input
          type="color"
          :value="textColor ?? '#000000'"
          :disabled="!isText"
          @input="$emit('textColor', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <span class="ftb-mini-sep" />
      <span class="ftb-label">字距</span>
      <button
        class="ftb-step"
        :disabled="!isText"
        title="减小字距"
        @click="$emit('letterSpacingStep', -0.5)"
      >−</button>
      <input
        class="ftb-num ftb-num-sm"
        type="number"
        :value="letterSpacing ?? 0"
        :disabled="!isText"
        step="0.5"
        title="字距 (px)"
        @change="onLetterSpacingChange"
      />
      <button
        class="ftb-step"
        :disabled="!isText"
        title="增大字距"
        @click="$emit('letterSpacingStep', 0.5)"
      >+</button>
    </div>

    <span class="ftb-sep" />

    <div class="ftb-group">
      <span class="ftb-label">纸张</span>
      <select
        class="ftb-select"
        :value="paperKey"
        title="纸张大小"
        @change="$emit('setPaper', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="p in PAPER_OPTIONS" :key="p.key" :value="p.key">{{ p.label }}</option>
      </select>
    </div>

    <span class="ftb-sep" />

    <div class="ftb-group">
      <span class="ftb-label">缩放</span>
      <select
        class="ftb-select"
        :value="zoomPercent"
        title="画布缩放"
        @change="onZoomChange"
      >
        <option v-for="z in ZOOM_OPTIONS" :key="z" :value="z">{{ z }}%</option>
      </select>
    </div>

    <div class="ftb-spacer" />

    <div class="ftb-group">
      <button
        class="ftb-btn"
        title="HTML 预览"
        @click="$emit('htmlPreview')"
      ><span style="font-size: 11px; font-weight: 600">HTML</span></button>
      <button
        class="ftb-btn"
        title="截图"
        @click="$emit('screenshot')"
      ><camera-outlined /></button>
      <button
        class="ftb-btn"
        title="画笔(预留)"
        @click="$emit('pen')"
      ><edit-outlined /></button>
      <button
        class="ftb-btn"
        :title="theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'"
        @click="onToggleTheme"
      ><sun-outlined v-if="theme === 'dark'" /><moon-outlined v-else /></button>
      <button
        class="ftb-btn"
        title="设置"
        @click="settingsOpen = true"
      ><setting-outlined /></button>
      <button
        class="ftb-btn"
        title="帮助"
        @click="helpOpen = true"
      ><question-circle-outlined /></button>
      <button
        class="ftb-btn danger"
        title="清空全部"
        @click="onClear"
      ><span v-html="trashIcon" /></button>
    </div>
    </div><!-- /.ftb-main -->

    <button
      class="ftb-scroll"
      :disabled="!canScrollRight"
      title="向右滚动工具栏"
      aria-label="向右滚动工具栏"
      @click="scrollBy(1)"
    ><span v-html="chevronRightIcon" /></button>

    <!-- 设置 modal -->
    <div v-if="settingsOpen" class="ftb-modal-mask" @click.self="settingsOpen = false">
      <div class="ftb-modal">
        <div class="ftb-modal-title">设置</div>
        <div class="ftb-modal-body">
          <p class="ftb-modal-hint">全局设置(预留)</p>
          <p class="ftb-modal-desc">后续 PR 可加:网格间距默认值 / 默认字号 / 缩放档位 / 撤销栈容量 / 自动保存间隔等。</p>
        </div>
        <div class="ftb-modal-footer">
          <button class="ftb-modal-btn" @click="settingsOpen = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 帮助 modal -->
    <div v-if="helpOpen" class="ftb-modal-mask" @click.self="helpOpen = false">
      <div class="ftb-modal">
        <div class="ftb-modal-title">关于 / 帮助</div>
        <div class="ftb-modal-body">
          <p><b>vue3-hiprint · 新设计器</b></p>
          <p class="ftb-modal-desc">现代化打印模板设计器,基于 Vue 3 + TypeScript,不可变 schema,核心零依赖。</p>
          <p class="ftb-modal-hint">快捷键</p>
          <ul class="ftb-modal-list">
            <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> 撤销</li>
            <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> 重做</li>
            <li><kbd>Delete</kbd> / <kbd>Backspace</kbd> 删除选中元素</li>
            <li><kbd>Esc</kbd> 取消选中</li>
            <li>画布点击空白处取消选中</li>
          </ul>
        </div>
        <div class="ftb-modal-footer">
          <button class="ftb-modal-btn" @click="helpOpen = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { HorizontalAlign, VerticalAlign } from '../core/align'

const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 200] as const

interface FontOption {
  value: string
  label: string
}
const FONT_OPTIONS: FontOption[] = [
  { value: 'SimSun, "宋体", serif', label: '宋体' },
  { value: 'SimHei, "黑体", sans-serif', label: '黑体' },
  { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑' },
  { value: 'KaiTi, "楷体", serif', label: '楷体' },
  { value: 'FangSong, "仿宋", serif', label: '仿宋' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier New' },
]

interface PaperOption {
  key: string
  label: string
  width: number
  height: number
}
const PAPER_OPTIONS: PaperOption[] = [
  { key: 'A4', label: 'A4 (210×297mm)', width: 210, height: 297 },
  { key: 'A5', label: 'A5 (148×210mm)', width: 148, height: 210 },
  { key: 'A3', label: 'A3 (297×420mm)', width: 297, height: 420 },
  { key: 'Letter', label: 'Letter (216×279mm)', width: 216, height: 279 },
]

const props = defineProps<{
  canUndo: boolean
  canRedo: boolean
  showGrid: boolean
  hasSelection: boolean
  zoom: number
  /** 纸张 key,如 'A4' */
  paperKey: string
  /** 选中元素是否为文本(text) */
  isText: boolean
  /** 当前字号(text 元素) */
  fontSize: number | null
  /** 当前字体(text 元素) */
  fontFamily: string | null
  /** 当前字距 px(text 元素) */
  letterSpacing: number | null
  /** 粗体/斜体/下划线/删除线激活态 */
  boldActive: boolean
  italicActive: boolean
  underlineActive: boolean
  strikeActive: boolean
  /** 当前文字颜色 */
  textColor: string | null
  /** 列表模式:'none' | 'ul' | 'ol' */
  listType: 'none' | 'ul' | 'ol'
  /** 手型拖动模式激活态(用于按钮 active 样式) */
  panMode: boolean
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  toggleGrid: []
  alignH: [mode: HorizontalAlign]
  alignV: [mode: VerticalAlign]
  clear: []
  print: []
  printPreview: []
  setZoom: [z: number]
  setPaper: [key: string]
  fontSizeStep: [delta: number]
  letterSpacingStep: [delta: number]
  toggleBold: []
  toggleItalic: []
  toggleUnderline: []
  toggleStrike: []
  textColor: [color: string]
  fontFamily: [family: string]
  toggleList: [mode: 'none' | 'ul' | 'ol']
  togglePan: []
  toggleTheme: []
  htmlPreview: []
  screenshot: []
  pen: []
}>()

const zoomPercent = computed(() => Math.round((props.zoom ?? 1) * 100))
const printMenuOpen = ref(false)
const printMenuRef = ref<HTMLElement | null>(null)
const settingsOpen = ref(false)
const helpOpen = ref(false)
const theme = ref<'light' | 'dark'>('light')

// 工具条横向滚动按钮:监听 scroller ref 的 scroll 状态
const scrollerRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
function updateScrollState() {
  const el = scrollerRef.value
  if (!el) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}
function scrollBy(direction: -1 | 1) {
  const el = scrollerRef.value
  if (!el) return
  el.scrollBy({ left: direction * Math.max(120, el.clientWidth * 0.6), behavior: 'smooth' })
}

function onZoomChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  emit('setZoom', v / 100)
}

function onFontSizeChange(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (!Number.isNaN(v) && v > 0) emit('fontSizeStep', v - (props.fontSize ?? 0))
}

function onLetterSpacingChange(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (!Number.isNaN(v)) emit('letterSpacingStep', v - (props.letterSpacing ?? 0))
}

function onFontFamilyChange(e: Event) {
  emit('fontFamily', (e.target as HTMLSelectElement).value)
}

function onToggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  emit('toggleTheme')
}

function onClear() {
  if (window.confirm('清空全部元素?此操作可撤销。')) {
    emit('clear')
  }
}

function onDocumentMouseDown(e: MouseEvent) {
  if (!printMenuOpen.value) return
  if (printMenuRef.value && !printMenuRef.value.contains(e.target as Node)) {
    printMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown)
  // 初始化滚动状态(可能一上来就能向右滚)
  setTimeout(updateScrollState, 0)
  // 内容宽度变化时也更新(放 resize listener 简化)
  window.addEventListener('resize', updateScrollState)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMouseDown)
  window.removeEventListener('resize', updateScrollState)
})

// 内联 SVG icons(heroicons-style 1.5px stroke)
const stroke = 'currentColor'
const sw = 1.5
const undoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>`
const redoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>`
const gridIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`
const alignLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`
const alignCenterHIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`
const alignRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>`
const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`
const chevronLeftIcon = `<svg viewBox="0 0 24 24" width="16" height="16" class="relative z-10 h-4 w-4"><path fill="currentColor" d="M15.4 16.6L10.8 12l4.6-4.6L14 6l-6 6l6 6z"/></svg>`
const chevronRightIcon = `<svg viewBox="0 0 24 24" width="16" height="16" class="relative z-10 h-4 w-4"><path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"/></svg>`
</script>

<style scoped>
.ftb {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  height: 44px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  user-select: none;
}
.ftb-main {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  min-width: 0;
  /* 隐藏滚动条但保留滚动功能(让位给左右 scroll 按钮) */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.ftb-main::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.ftb-scroll {
  position: relative;
  z-index: 10;
  flex: 0 0 auto;
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  padding: 0;
  background: #fff;
  border: 0;
  border-left: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  border-radius: 0;
  color: #595959;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.ftb-scroll:hover:not(:disabled) {
  background: #f5f5f5;
  color: #1677ff;
}
.ftb-scroll:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ftb-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
.ftb-dropdown {
  position: relative;
}
.ftb-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 140px;
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
.ftb-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 13px;
  color: #333;
  background: transparent;
  border: 0;
  border-radius: 3px;
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.ftb-menu-item:hover {
  background: #f5f5f5;
  color: #1677ff;
}
.ftb-btn,
.ftb-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #444;
  cursor: pointer;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.ftb-btn {
  width: 28px;
}
.ftb-step {
  width: 22px;
  font-size: 14px;
  font-weight: 500;
}
.ftb-btn:hover:not(:disabled),
.ftb-step:hover:not(:disabled) {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.ftb-btn.active {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #1677ff;
}
.ftb-btn:disabled,
.ftb-step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ftb-btn.danger:hover:not(:disabled) {
  background: #fff1f0;
  border-color: #ffa39e;
  color: #ff4d4f;
}
.ftb-sep {
  width: 1px;
  height: 18px;
  background: #e0e0e0;
  margin: 0 4px;
  flex: 0 0 auto;
}
.ftb-mini-sep {
  width: 1px;
  height: 16px;
  background: #e8e8e8;
  margin: 0 2px;
  flex: 0 0 auto;
}
.ftb-spacer {
  flex: 1;
}
.ftb-label {
  font-size: 12px;
  color: #666;
  margin-right: 4px;
}
.ftb-num {
  width: 42px;
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  text-align: center;
  outline: none;
  margin: 0 2px;
}
.ftb-num-sm {
  width: 38px;
}
.ftb-num:hover:not(:disabled),
.ftb-num:focus {
  border-color: #1677ff;
}
.ftb-num:disabled {
  background: #f5f5f5;
  color: #bfbfbf;
  cursor: not-allowed;
}
.ftb-select {
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  outline: none;
}
.ftb-select:hover {
  border-color: #1677ff;
}
.ftb-select:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}
.ftb-color {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  cursor: pointer;
  border-radius: 4px;
  color: #444;
}
.ftb-color.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ftb-color:hover:not(.disabled) {
  background: #e6f4ff;
  color: #1677ff;
}
.ftb-color-swatch {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 3px;
  border-radius: 1px;
}
.ftb-color input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: inherit;
}
.ftb-color.disabled input[type="color"] {
  pointer-events: none;
}
.ftb-btn :deep(.anticon) {
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
}
.ftb-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ftb-modal {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  min-width: 360px;
  max-width: 480px;
  overflow: hidden;
}
.ftb-modal-title {
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
}
.ftb-modal-body {
  padding: 20px;
  font-size: 13px;
  color: #333;
  line-height: 1.6;
}
.ftb-modal-body p {
  margin: 0 0 8px;
}
.ftb-modal-hint {
  font-weight: 600;
  margin-top: 12px !important;
}
.ftb-modal-desc {
  color: #666;
  font-size: 12px;
}
.ftb-modal-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  font-size: 12px;
  color: #555;
}
.ftb-modal-list li {
  margin-bottom: 4px;
}
.ftb-modal-list kbd {
  display: inline-block;
  padding: 1px 6px;
  font-family: monospace;
  font-size: 11px;
  background: #f5f5f5;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  box-shadow: 0 1px 0 #d0d0d0;
}
.ftb-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.ftb-modal-btn {
  padding: 4px 16px;
  background: #1677ff;
  color: #fff;
  border: 1px solid #1677ff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.ftb-modal-btn:hover {
  background: #4096ff;
  border-color: #4096ff;
}
</style>
