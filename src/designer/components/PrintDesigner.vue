<template>
  <div ref="rootRef" class="print-designer">
    <TopBar
      :dirty="designer.dirty.value"
      @save="onSave"
      @save-as="onSaveAs"
      @preview="onPreview"
      @print="onPrint"
      @export-pdf="onExportPdf"
      @export-html="onExportHtml"
      @export-images="onExportImages"
      @toolbar-reorder="onToolbarReorder"
      @help="onHelp"
      @settings="onSettings"
    />
    <HeaderToolbar
      :can-undo="designer.canUndo.value"
      :can-redo="designer.canRedo.value"
      :show-grid="designer.showGrid.value"
      :has-selection="!!designer.selectedId.value"
      :locked="!!designer.selected.value?.locked"
      :multi-count="designer.multiSelectedIds.value.length"
      :is-text="isText"
      :font-size="currentFontSize"
      :font-family="currentFontFamily"
      :text-color="currentTextColor"
      :bold-active="boldActive"
      :italic-active="italicActive"
      :underline-active="underlineActive"
      :strike-active="strikeActive"
      :paper-key="paperKey"
      :zoom="designer.zoom.value"
      :pan-mode="panModeActive"
      :theme="theme"
      :has-clipboard="designer.hasClipboard.value"
      :left-panel-open="leftPanelOpen"
      :property-panel-open="propertyPanelOpen"
      @undo="designer.undo"
      @redo="designer.redo"
      @toggle-grid="designer.toggleGrid"
      @toggle-theme="onToggleTheme"
      @toggle-pan="onTogglePan"
      @toggle-lock="designer.toggleLock"
      @toggle-left-panel="onToggleLeftPanel"
      @toggle-property-panel="onTogglePropertyPanel"
      @select-all="designer.selectAllElements"
      @cut="onCutElement"
      @copy="onCopyElement"
      @paste="onPasteElement"
      @delete="designer.deleteSelection"
      @align="onAlignAll"
      @match-size="designer.matchSelectedElementsSize"
      @distribute="designer.distributeSelectedElements"
      @layer="onLayerMove"
      @font-size-step="onFontSizeStep"
      @font-family="onFontFamily"
      @on-text-color="onTextColor"
      @toggle-bold="onToggleBold"
      @toggle-italic="onToggleItalic"
      @toggle-underline="onToggleUnderline"
      @toggle-strike="onToggleStrike"
      @clear-format="onClearFormat"
      @reset-rotation="onResetRotation"
      @set-paper="onSetPaper"
      @set-zoom="onSetZoom"
      @reset-zoom="onResetZoom"
      @export-pdf="onExportPdf"
      @export-html="onExportHtml"
      @export-images="onExportImages"
      @preview="onPreview"
      @print="onPrint"
      @help="onHelp"
      @settings="onSettings"
    />
    <div class="body" ref="bodyRef" :class="{ 'left-closed': !leftPanelOpen }">
      <!-- 左侧元素面板(浮层,可关闭) -->
      <ElementsPanel
        :open="leftPanelOpen"
        @add="onAdd"
        @toggle-panel="onToggleLeftPanel"
      />
      <!-- 顶部水平 Ruler(浮在 .body 顶部,跨整个宽度) -->
      <div class="ruler-slot ruler-slot-h">
        <Ruler
          type="horizontal"
          :zoom="designer.zoom.value"
          :scroll="rulerScrollX"
          :offset="rulerOffsetX"
          :indicators="rulerIndicatorsH"
          :range="rulerRangeH"
          :unit="unit"
          :dark-mode="darkMode"
          @guide-drag-start="(e) => onGuideDragStart(e, 'horizontal')"
        />
      </div>
      <!-- 左侧垂直 Ruler(浮在 .body 左侧,ruler-h 之下) -->
      <div class="ruler-slot ruler-slot-v">
        <Ruler
          type="vertical"
          :zoom="designer.zoom.value"
          :scroll="rulerScrollY"
          :offset="rulerOffsetY"
          :indicators="rulerIndicatorsV"
          :range="rulerRangeV"
          :unit="unit"
          :dark-mode="darkMode"
          @guide-drag-start="(e) => onGuideDragStart(e, 'vertical')"
        />
      </div>

      <div class="main" ref="mainRef" @scroll.passive="onMainScroll">
        <DesignerCanvas
          :template="designer.template.value"
          :selected-id="designer.selectedId.value"
          :multi-selected-ids="designer.multiSelectedIds.value"
          :zoom="designer.zoom.value"
          :show-grid="designer.showGrid.value"
          :pan-mode="panModeActive"
          :pan-x="panOffset.x"
          :pan-y="panOffset.y"
          :has-clipboard="designer.hasClipboard.value"
          :can-undo="designer.canUndo.value"
          :can-redo="designer.canRedo.value"
          :dark-mode="darkMode"
          :guides="designer.guides.value"
          :highlighted-guide-id="designer.highlightedGuideId.value"
          @add="onAdd"
          @select="designer.select"
          @select-many="onSelectMany"
          @select-toggle="designer.toggleInMulti"
          @move="onMove"
          @move-many="designer.moveMany"
          @resize="onResize"
          @rotate="onRotate"
          @remove="onRemove"
          @remove-many="designer.removeMany"
          @pan="onCanvasPan"
          @ctx-action="onCtxAction"
          @guide-hover="designer.setHighlightedGuide"
          @guide-remove="designer.removeGuide"
        />
      </div>
      <PropertyPanel
        v-if="propertyPanelOpen"
        :element="designer.selected.value"
        @update="onUpdate"
        @add-element="onAddDefault"
        @duplicate="onDuplicate"
        @move-up="onMoveUp"
        @move-down="onMoveDown"
      />
    </div>

    <!-- 选中文本元素时浮在元素上方的快捷工具条 -->
    <TextQuickToolbar
      :element="selectedText"
      :disabled="!!designer.selected.value?.locked"
      @patch="onTextPatch"
    />

    <!-- 查看 JSON 弹窗 -->
    <div v-if="jsonModalOpen" class="json-modal-mask" @click.self="jsonModalOpen = false">
      <div class="json-modal">
        <div class="json-modal-header">
          <span>当前模板 JSON</span>
          <button class="json-modal-close" @click="jsonModalOpen = false">×</button>
        </div>
        <pre class="json-modal-body">{{ jsonText }}</pre>
        <div class="json-modal-footer">
          <button class="json-copy-btn" @click="onCopyJson">复制</button>
        </div>
      </div>
    </div>

    <!-- 隐藏的 JSON 文件选择 input -->
    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      style="display: none"
      @change="onImportFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import type { Element, ElementType, Template, TextElement } from '../core/types'
import { useDesigner } from '../api/useDesigner'
import { createTemplate } from '../core/schema'
import { printTemplate, previewTemplate } from '../utils/print'
import { exportPdf } from '../utils/pdf'
import TopBar from './TopBar.vue'
import HeaderToolbar from './HeaderToolbar.vue'
import DesignerCanvas from './DesignerCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import Ruler from './Ruler.vue'
import ElementsPanel from './ElementsPanel.vue'
import TextQuickToolbar from './TextQuickToolbar.vue'

const props = defineProps<{
  initialTemplate?: Template
  /** 打印时传入的渲染数据(表格 dataPath 会从这里取) */
  printData?: unknown
}>()

const emit = defineEmits<{
  /** designer.loadJson 失败 */
  jsonImportError: [raw: string]
  /** 打印失败 */
  printError: []
  /** 打印成功 */
  printOk: []
  /** 保存按钮被点(由消费方决定写到哪里) */
  save: [tpl: Template]
  /** 用户提示消费方 */
  notice: [message: string, type: 'info' | 'success' | 'warning' | 'error']
}>()

const designer = useDesigner({ template: props.initialTemplate })

// designer root(provide 给 TextQuickToolbar teleport 目标)
const rootRef = ref<HTMLElement | null>(null)
provide('designer-root', rootRef)

// 画布拖动模式(手型 / 空格键)
const panOffset = ref({ x: 0, y: 0 })

/** 空格键临时切换 panMode(松开恢复),不影响 toggle 后的状态 */
const spaceHeld = ref(false)
const togglePan = ref(false) // 用户通过手型按钮切到的状态

const panModeActive = computed(() => togglePan.value || spaceHeld.value)

/** 左侧元素面板开/关(S4 由 ElementsPanel 自身按钮切换) */
const leftPanelOpen = ref(true)
function onToggleLeftPanel() {
  leftPanelOpen.value = !leftPanelOpen.value
}

/** 右侧属性面板开/关(HeaderToolbar panel 按钮可以触发) */
const propertyPanelOpen = ref(true)
function onTogglePropertyPanel() {
  propertyPanelOpen.value = !propertyPanelOpen.value
}

/** 显示单位 + dark mode(S3 接入) */
const unit = ref<'mm' | 'px' | 'pt' | 'in' | 'cm'>('mm')
const darkMode = ref(false)

/** 从 ruler 区域按下:转 mm 坐标 + 调 store.addGuide */
function onGuideDragStart(e: MouseEvent, axis: 'horizontal' | 'vertical') {
  const main = mainRef.value
  if (!main) return
  const rect = main.getBoundingClientRect()
  const pxPerMm = (96 / 25.4) * designer.zoom.value
  // ruler 厚 32px 在 main 顶部/左侧
  let positionMm: number
  if (axis === 'horizontal') {
    const yPx = e.clientY - rect.top + main.scrollTop - 32
    positionMm = yPx / pxPerMm
  } else {
    const xPx = e.clientX - rect.left - 32
    positionMm = xPx / pxPerMm
  }
  designer.addGuide(axis, Math.max(0, positionMm))
}

// ========== Ruler 用的 scroll / offset / indicators / range ==========
const mainRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

const rulerScrollX = ref(0) // .canvas-wrap.scrollLeft(横滚)
const rulerScrollY = ref(0) // .main.scrollTop(纵滚)
const rulerOffsetX = ref(0) // canvas 0mm 位置在 .main 内的 px(未滚时)
const rulerOffsetY = ref(0) // canvas 0mm 位置在 .main 内的 px(未滚时)

function onMainScroll() {
  const main = mainRef.value
  if (!main) return
  rulerScrollY.value = main.scrollTop
  const wrap = main.querySelector('.canvas-wrap') as HTMLElement | null
  if (wrap) rulerScrollX.value = wrap.scrollLeft
}

function measureRulerOffsets() {
  const main = mainRef.value
  if (!main) return
  const canvas = main.querySelector('.canvas') as HTMLElement | null
  if (!canvas) return
  const cr = canvas.getBoundingClientRect()
  const mr = main.getBoundingClientRect()
  // canvas 0mm 真实位置(未滚 main 时) - 滚出 main viewport 时会被 ruler 用 scroll 校正
  rulerOffsetX.value = cr.left - mr.left
  rulerOffsetY.value = cr.top - mr.top
}

let rulerResizeObserver: ResizeObserver | null = null
onMounted(() => {
  // 监听 .main / .canvas 大小变化,重算 ruler offset
  if (mainRef.value && 'ResizeObserver' in window) {
    rulerResizeObserver = new ResizeObserver(() => measureRulerOffsets())
    rulerResizeObserver.observe(mainRef.value)
    const canvas = mainRef.value.querySelector('.canvas')
    if (canvas) rulerResizeObserver.observe(canvas)
    const wrap = mainRef.value.querySelector('.canvas-wrap')
    if (wrap) rulerResizeObserver.observe(wrap)
  }
})
onBeforeUnmount(() => {
  rulerResizeObserver?.disconnect()
})

// paper / zoom 变化时 canvas 尺寸变,需要重测
watch(
  () => [designer.template.value.paper.width, designer.template.value.paper.height, designer.zoom.value],
  () => nextTick(measureRulerOffsets),
)

/** 选中元素 4 边位置 + 范围(在 ruler 上画蓝短线 + 浅蓝填充) */
const INDICATOR_COLOR = 'rgba(22, 119, 255, 0.5)'
const RANGE_COLOR = 'rgba(22, 119, 255, 0.18)'

const rulerIndicatorsH = computed(() => {
  const el = designer.selected.value
  if (!el) return []
  return [
    { position: el.x, color: INDICATOR_COLOR },
    { position: el.x + el.w, color: INDICATOR_COLOR },
  ]
})
const rulerIndicatorsV = computed(() => {
  const el = designer.selected.value
  if (!el) return []
  return [
    { position: el.y, color: INDICATOR_COLOR },
    { position: el.y + el.h, color: INDICATOR_COLOR },
  ]
})
const rulerRangeH = computed(() => {
  const el = designer.selected.value
  if (!el) return null
  return { start: el.x, end: el.x + el.w, color: RANGE_COLOR }
})
const rulerRangeV = computed(() => {
  const el = designer.selected.value
  if (!el) return null
  return { start: el.y, end: el.y + el.h, color: RANGE_COLOR }
})

function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space' && !spaceHeld.value) {
    // 仅在非输入控件聚焦时响应
    const tag = (e.target as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    spaceHeld.value = true
  }
  if (e.code === 'Delete' || e.code === 'Backspace') {
    const tag = (e.target as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    const ids = designer.multiSelectedIds.value
    if (ids.length > 0) {
      e.preventDefault()
      designer.removeMany(ids)
    }
  }
  if (e.key === 'Escape') {
    designer.clearSelection()
  }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') spaceHeld.value = false
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
})

function onTogglePan() {
  togglePan.value = !togglePan.value
}

function onCanvasPan(dx: number, dy: number) {
  panOffset.value = { x: panOffset.value.x + dx, y: panOffset.value.y + dy }
}

// 派生:当前选中文本元素的状态
const selectedText = computed<TextElement | null>(() => {
  const el = designer.selected.value
  return el && el.type === 'text' ? el : null
})
const isText = computed(() => !!selectedText.value)
const currentFontSize = computed<number | null>(() => selectedText.value?.fontSize ?? null)
const currentFontFamily = computed<string | null>(() => selectedText.value?.fontFamily ?? null)
const currentTextColor = computed<string | null>(() => selectedText.value?.color ?? null)
const boldActive = computed(() => {
  const fw = selectedText.value?.fontWeight
  return fw === 'bold' || fw === '700' || fw === '900'
})
const italicActive = computed(() => selectedText.value?.fontStyle === 'italic')
const underlineActive = computed(() => selectedText.value?.textDecoration === 'underline')
const strikeActive = computed(() => selectedText.value?.textDecoration === 'line-through')

// 派生:当前 paper key(用于 HeaderToolbar 选中态)
const paperKey = computed(() => {
  const { width, height } = designer.template.value.paper
  if (width === 210 && height === 297) return 'A4'
  if (width === 148 && height === 210) return 'A5'
  if (width === 297 && height === 420) return 'A3'
  if (width === 216 && height === 279) return 'Letter'
  return 'A4'
})

function onAdd(type: ElementType, position?: { x: number; y: number }) {
  designer.add(type, undefined, position)
}

function onAddDefault() {
  designer.add('text')
}

function onMove(id: string, x: number, y: number) {
  designer.update(id, { x, y })
}

function onResize(id: string, patch: { x: number; y: number; w: number; h: number }) {
  designer.update(id, patch)
}

function onRotate(id: string, deg: number) {
  designer.update(id, { rotate: deg } as Partial<Element>)
}

function onCtxAction(
  action:
    | 'copy' | 'cut' | 'paste'
    | 'bringToFront' | 'sendToBack' | 'moveUp' | 'moveDown'
    | 'toggleLock' | 'undo' | 'redo',
  payload?: { id?: string; x?: number; y?: number },
) {
  switch (action) {
    case 'copy': if (payload?.id) designer.copyElement(payload.id); break
    case 'cut': if (payload?.id) designer.cutElement(payload.id); break
    case 'paste': designer.pasteElement(payload?.x, payload?.y); break
    case 'bringToFront': if (payload?.id) designer.bringToFront(payload.id); break
    case 'sendToBack': if (payload?.id) designer.sendToBack(payload.id); break
    case 'moveUp': if (payload?.id) designer.moveUp(payload.id); break
    case 'moveDown': if (payload?.id) designer.moveDown(payload.id); break
    case 'toggleLock': {
      if (!payload?.id) break
      const e = designer.selected.value
      designer.setLocked(payload.id, !e?.locked)
      break
    }
    case 'undo': designer.undo(); break
    case 'redo': designer.redo(); break
  }
}

function onUpdate(id: string, patch: Partial<Element>) {
  designer.update(id, patch)
}

function onRemove(id: string) {
  designer.remove(id)
}

function onSelectMany(ids: string[]) {
  designer.selectMany(ids)
}

function onDuplicate() {
  const id = designer.selectedId.value
  if (id) designer.duplicate(id)
}

function onMoveUp() {
  const id = designer.selectedId.value
  if (id) designer.moveUp(id)
}

function onMoveDown() {
  const id = designer.selectedId.value
  if (id) designer.moveDown(id)
}

function onAlignAll(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  designer.alignSelectedElements(mode)
}

/** HeaderToolbar layer 按钮(置顶/置底/上移/下移) */
function onLayerMove(mode: 'front' | 'back' | 'forward' | 'backward') {
  const ids = designer.multiSelectedIds.value
  if (ids.length === 0) return
  for (const id of ids) {
    if (mode === 'front') designer.bringToFront(id)
    else if (mode === 'back') designer.sendToBack(id)
    else if (mode === 'forward') designer.moveUp(id)
    else designer.moveDown(id)
  }
}

/** HeaderToolbar 复制/剪切/粘贴:用 store 单元素版本 */
function onCopyElement() {
  const id = designer.selectedId.value
  if (id) designer.copyElement(id)
}
function onCutElement() {
  const id = designer.selectedId.value
  if (id) designer.cutElement(id)
}
function onPasteElement() {
  designer.pasteElement()
}

/** HeaderToolbar 缩放 +/- 按钮 */
function onSetZoom(z: number) {
  designer.setZoom(z)
}
function onResetZoom() {
  designer.setZoom(1)
}

/** HeaderToolbar 清除格式(text) */
function onClearFormat() {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, {
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    fontSize: 12,
  } as Partial<TextElement>)
}

/** HeaderToolbar 重置旋转 */
function onResetRotation() {
  const id = designer.selectedId.value
  if (!id) return
  designer.update(id, { rotate: 0 } as Partial<Element>)
}

/** TextQuickToolbar 文本字段 patch */
function onTextPatch(patch: Partial<TextElement>) {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, patch)
}

function onSetPaper(key: string) {
  const presets: Record<string, { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    A3: { width: 297, height: 420 },
    Letter: { width: 216, height: 279 },
  }
  const p = presets[key] ?? presets.A4
  designer.setPaper(p)
}

function onFontSizeStep(delta: number) {
  const id = designer.selectedId.value
  const t = selectedText.value
  if (!id || !t) return
  const next = Math.max(6, Math.min(96, (t.fontSize ?? 12) + delta))
  designer.update(id, { fontSize: next } as Partial<TextElement>)
}

function onFontFamily(family: string) {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, { fontFamily: family || undefined } as Partial<TextElement>)
}

function onToggleBold() {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, {
    fontWeight: boldActive.value ? 'normal' : 'bold',
  } as Partial<TextElement>)
}

function onToggleItalic() {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, {
    fontStyle: italicActive.value ? 'normal' : 'italic',
  } as Partial<TextElement>)
}

function onToggleUnderline() {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, {
    textDecoration: underlineActive.value ? 'none' : 'underline',
  } as Partial<TextElement>)
}

function onToggleStrike() {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, {
    textDecoration: strikeActive.value ? 'none' : 'line-through',
  } as Partial<TextElement>)
}

function onTextColor(color: string) {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, { color } as Partial<TextElement>)
}

async function onPrint() {
  const ok = await printTemplate(designer.template.value, props.printData)
  if (ok) emit('printOk')
  else emit('printError')
}

async function onPreview() {
  await previewTemplate(designer.template.value, props.printData)
}

function onSave() {
  designer.markClean()
  emit('save', designer.template.value)
}

function onReset() {
  designer.load(createTemplate())
  emit('notice', '已重置为空白模板', 'info')
}

async function onExportPdf() {
  emit('notice', '正在生成 PDF...', 'info')
  const ok = await exportPdf(designer.template.value, props.printData)
  if (ok) emit('notice', 'PDF 已下载', 'success')
  else emit('notice', 'PDF 生成失败', 'error')
}

// ========== JSON 查看 / 导出 ==========

const jsonModalOpen = ref(false)
/** 实时计算(toJson 每次返回新字符串,computed 会因 template 变化重算) */
const jsonText = computed(() => designer.toJson())

function onViewJson() {
  jsonModalOpen.value = true
}

function onExportJson() {
  const json = designer.toJson()
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template.json'
  a.click()
  URL.revokeObjectURL(url)
  emit('notice', 'JSON 已下载', 'success')
}

function onCopyJson() {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(jsonText.value).then(
      () => emit('notice', '已复制到剪贴板', 'success'),
      () => emit('notice', '复制失败', 'error'),
    )
  } else {
    emit('notice', '当前浏览器不支持剪贴板 API', 'warning')
  }
}

// 隐藏的 file input,触发后调 loadJson
const importInputRef = ref<HTMLInputElement | null>(null)

function onImportJson() {
  importInputRef.value?.click()
}

function onImportFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 立刻清空 value,让下次选同一文件也能触发 change
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const raw = (ev.target?.result as string) ?? ''
    const ok = designer.loadJson(raw)
    if (ok) emit('notice', 'JSON 导入成功', 'success')
    else emit('jsonImportError', raw)
  }
  reader.onerror = () => emit('notice', '文件读取失败', 'error')
  reader.readAsText(file)
}

const theme = computed<'light' | 'dark'>(() => (darkMode.value ? 'dark' : 'light'))
function onToggleTheme() {
  darkMode.value = !darkMode.value
  emit('notice', darkMode.value ? '已切换到深色模式' : '已切换到浅色模式', 'info')
}

function onSaveAs() {
  emit('notice', '另存为模板(预留,后续接入模板中心)', 'info')
}

function onExportHtml() {
  emit('notice', '导出 HTML(预留,后续接入)', 'info')
}

function onExportImages() {
  emit('notice', '导出图片(预留,后续接入 html2canvas)', 'info')
}

function onToolbarReorder() {
  emit('notice', '工具条重排(预留)', 'info')
}

function onHelp() {
  emit('notice', '帮助(预留)', 'info')
}

function onSettings() {
  emit('notice', '设置(预留)', 'info')
}

// 暴露给父组件:打印 / 导入导出
defineExpose({
  designer,
  toJson: () => designer.toJson(),
  loadJson: (raw: string) => {
    const ok = designer.loadJson(raw)
    if (!ok) emit('jsonImportError', raw)
    return ok
  },
  print: () => onPrint(),
})
</script>

<style scoped>
.print-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #f5f5f5;
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative; /* Ruler / PropertyPanel 浮层锚定 */
  overflow: hidden;
}
/* Ruler 浮在 .body 顶部/左侧(避开 ElementsPanel) */
.ruler-slot {
  position: absolute;
  z-index: 5;
  pointer-events: none; /* 让下层 canvas 接收事件;Ruler 自己内部 pointer-events: auto */
}
.ruler-slot-h {
  top: 0;
  left: 240px; /* 避开 ElementsPanel(S4 面板宽度);折叠时 .body 通过 JS 调整 */
  right: 0;
  height: 32px;
  transition: left 200ms;
}
.ruler-slot-v {
  top: 32px;
  left: 240px;
  bottom: 0;
  width: 32px;
  transition: left 200ms;
}
/* 折叠状态:ruler 缩到 0 */
.body.left-closed .ruler-slot-h,
.body.left-closed .ruler-slot-v {
  left: 0;
}
.main {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
  /* 不给 ruler 让位:ruler 浮在 .body 顶部/左侧(pointer-events: none),
     自线 / 吸附线在 .canvas-wrap 内跨整个 wrap 高度,自然延伸到 ruler 区域 */
  overflow-x: hidden;
  overflow-y: auto;
}

/* JSON 弹窗 */
.json-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.json-modal {
  width: 720px;
  max-width: 90vw;
  max-height: 80vh;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.json-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.json-modal-close {
  background: transparent;
  border: 0;
  font-size: 20px;
  line-height: 1;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
}
.json-modal-close:hover {
  color: #333;
}
.json-modal-body {
  flex: 1;
  margin: 0;
  padding: 12px 16px;
  overflow: auto;
  background: #f6f8fa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #24292e;
  white-space: pre;
}
.json-modal-footer {
  padding: 8px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  background: #fafafa;
}
.json-copy-btn {
  padding: 4px 14px;
  font-size: 13px;
  color: #fff;
  background: #1677ff;
  border: 1px solid #1677ff;
  border-radius: 4px;
  cursor: pointer;
}
.json-copy-btn:hover {
  background: #4096ff;
  border-color: #4096ff;
}
</style>
