<template>
  <div class="print-designer">
    <TopBar
      :dirty="designer.dirty.value"
      @add="onAdd"
      @save="onSave"
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
      :bold-active="boldActive"
      :italic-active="italicActive"
      :underline-active="underlineActive"
      :strike-active="strikeActive"
      :text-color="currentTextColor"
      @undo="designer.undo"
      @redo="designer.redo"
      @toggle-grid="designer.toggleGrid"
      @align-h="onAlignH"
      @align-v="onAlignV"
      @clear="designer.clearElements"
      @print="onPrint"
      @print-preview="onPreview"
      @set-zoom="designer.setZoom"
      @set-paper="onSetPaper"
      @font-size-step="onFontSizeStep"
      @toggle-bold="onToggleBold"
      @toggle-italic="onToggleItalic"
      @toggle-underline="onToggleUnderline"
      @toggle-strike="onToggleStrike"
      @text-color="onTextColor"
    />
    <div class="main">
      <DesignerCanvas
        :template="designer.template.value"
        :selected-id="designer.selectedId.value"
        :zoom="designer.zoom.value"
        :show-grid="designer.showGrid.value"
        @add="onAdd"
        @select="designer.select"
        @move="onMove"
        @remove="onRemove"
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Element, ElementType, Template, TextElement } from '../core/types'
import { useDesigner } from '../api/useDesigner'
import { alignHorizontal, alignVertical, type HorizontalAlign, type VerticalAlign } from '../core/align'
import { printTemplate, previewTemplate } from '../utils/print'
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
}>()

const designer = useDesigner({ template: props.initialTemplate })

// 派生:当前选中文本元素的状态
const selectedText = computed<TextElement | null>(() => {
  const el = designer.selected.value
  return el && el.type === 'text' ? el : null
})
const isText = computed(() => !!selectedText.value)
const currentFontSize = computed<number | null>(() => selectedText.value?.fontSize ?? null)
const currentTextColor = computed<string | null>(() => selectedText.value?.color ?? null)
const boldActive = computed(() => {
  const fw = selectedText.value?.fontWeight
  return fw === 'bold' || fw === '700' || fw === '900'
})
const italicActive = computed(() => selectedText.value?.fontStyle === 'italic')
const underlineActive = computed(() => selectedText.value?.textDecoration === 'underline')
const strikeActive = computed(() => selectedText.value?.textDecoration === 'line-through')

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

function onUpdate(id: string, patch: Partial<Element>) {
  designer.update(id, patch)
}

function onRemove(id: string) {
  designer.remove(id)
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
  overflow: hidden;
}
</style>
