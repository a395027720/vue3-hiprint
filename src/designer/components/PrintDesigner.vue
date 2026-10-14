<template>
  <div class="print-designer">
    <TopBar
      :dirty="designer.dirty.value"
      @add="onAdd"
      @save="onSave"
      @reset="onReset"
      @view-json="onViewJson"
      @export-json="onExportJson"
      @import-json="onImportJson"
      @print="onPrint"
      @print-preview="onPreview"
      @export-pdf="onExportPdf"
    />
    <FormatToolbar
      :can-undo="designer.canUndo.value"
      :can-redo="designer.canRedo.value"
      :show-grid="designer.showGrid.value"
      :has-selection="!!designer.selectedId.value"
      :zoom="designer.zoom.value"
      :paper-key="paperKey"
      :is-text="isText"
      :font-size="currentFontSize"
      :font-family="currentFontFamily"
      :letter-spacing="currentLetterSpacing"
      :bold-active="boldActive"
      :italic-active="italicActive"
      :underline-active="underlineActive"
      :strike-active="strikeActive"
      :text-color="currentTextColor"
      :list-type="currentListType"
      :pan-mode="panModeActive"
      @undo="designer.undo"
      @redo="designer.redo"
      @toggle-grid="designer.toggleGrid"
      @align-h="onAlignH"
      @align-v="onAlignV"
      @clear="designer.clearElements"
      @set-zoom="designer.setZoom"
      @set-paper="onSetPaper"
      @font-size-step="onFontSizeStep"
      @letter-spacing-step="onLetterSpacingStep"
      @font-family="onFontFamily"
      @toggle-bold="onToggleBold"
      @toggle-italic="onToggleItalic"
      @toggle-underline="onToggleUnderline"
      @toggle-strike="onToggleStrike"
      @text-color="onTextColor"
      @toggle-list="onToggleList"
      @toggle-theme="onToggleTheme"
      @html-preview="onPreview"
      @screenshot="onScreenshot"
      @pen="onPen"
      @toggle-pan="onTogglePan"
    />
    <div class="main">
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
      />
      <PropertyPanel
        :element="designer.selected.value"
        @update="onUpdate"
        @add-element="onAddDefault"
        @duplicate="onDuplicate"
        @move-up="onMoveUp"
        @move-down="onMoveDown"
      />
    </div>

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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Element, ElementType, Template, TextElement } from '../core/types'
import { useDesigner } from '../api/useDesigner'
import { createTemplate } from '../core/schema'
import { alignHorizontal, alignVertical, type HorizontalAlign, type VerticalAlign } from '../core/align'
import { printTemplate, previewTemplate } from '../utils/print'
import { exportPdf } from '../utils/pdf'
import TopBar from './TopBar.vue'
import FormatToolbar from './FormatToolbar.vue'
import DesignerCanvas from './DesignerCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'

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

// 画布拖动模式(手型 / 空格键)
const panOffset = ref({ x: 0, y: 0 })

/** 空格键临时切换 panMode(松开恢复),不影响 toggle 后的状态 */
const spaceHeld = ref(false)
const togglePan = ref(false) // 用户通过手型按钮切到的状态

const panModeActive = computed(() => togglePan.value || spaceHeld.value)

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
const currentLetterSpacing = computed<number | null>(() => selectedText.value?.letterSpacing ?? null)
const currentTextColor = computed<string | null>(() => selectedText.value?.color ?? null)
const boldActive = computed(() => {
  const fw = selectedText.value?.fontWeight
  return fw === 'bold' || fw === '700' || fw === '900'
})
const italicActive = computed(() => selectedText.value?.fontStyle === 'italic')
const underlineActive = computed(() => selectedText.value?.textDecoration === 'underline')
const strikeActive = computed(() => selectedText.value?.textDecoration === 'line-through')
const currentListType = computed<'none' | 'ul' | 'ol'>(() => selectedText.value?.listType ?? 'none')

// 派生:当前 paper key(用于 FormatToolbar 选中态)
const paperKey = computed(() => {
  const { width, height } = designer.template.value.paper
  if (width === 210 && height === 297) return 'A4'
  if (width === 148 && height === 210) return 'A5'
  if (width === 297 && height === 420) return 'A3'
  if (width === 216 && height === 279) return 'Letter'
  return 'A4'
})

function onAdd(type: ElementType) {
  designer.add(type)
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

function onAlignH(mode: HorizontalAlign) {
  const id = designer.selectedId.value
  if (!id) return
  designer.template.value = alignHorizontal(designer.template.value, id, mode)
}

function onAlignV(mode: VerticalAlign) {
  const id = designer.selectedId.value
  if (!id) return
  designer.template.value = alignVertical(designer.template.value, id, mode)
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

function onLetterSpacingStep(delta: number) {
  const t = selectedText.value
  if (!t) return
  const next = Math.max(0, (t.letterSpacing ?? 0) + delta)
  designer.update(t.id, { letterSpacing: next } as Partial<TextElement>)
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

function onToggleList(mode: 'none' | 'ul' | 'ol') {
  const t = selectedText.value
  if (!t) return
  designer.update(t.id, { listType: mode } as Partial<TextElement>)
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

const theme = computed<'light' | 'dark'>(() => 'light')
function onToggleTheme() {
  emit('notice', '主题切换(预留,本设计器暂未实现深色配色)', 'info')
}

function onScreenshot() {
  // 截图:用 printTemplate 触发系统打印(用户可选"另存为 PDF"模拟截图)
  // 完整 html2canvas 截图需新加依赖,后续 PR
  emit('notice', '截图:已触发系统打印,可另存为 PDF。需要像素级截图请等待后续 PR(html2canvas 集成)', 'info')
  printTemplate(designer.template.value, props.printData)
}

function onPen() {
  emit('notice', '画笔(预留,本设计器暂未实现手绘元素)', 'info')
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
.main {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative; /* sticky ruler 找这个做滚动容器 */
  overflow: auto; /* 滚动在 .main(让 ruler sticky 粘到 .main viewport 边缘) */
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
