<template>
  <div class="print-designer">
    <ElementPalette @add="onAdd" />
    <div class="canvas-col">
      <CanvasToolbar
        :can-undo="designer.canUndo.value"
        :can-redo="designer.canRedo.value"
        :show-grid="designer.showGrid.value"
        :has-selection="!!designer.selectedId.value"
        :zoom="designer.zoom.value"
        @undo="designer.undo"
        @redo="designer.redo"
        @toggle-grid="designer.toggleGrid"
        @align-h="onAlignH"
        @align-v="onAlignV"
        @clear="onClear"
        @print="onPrint"
        @set-zoom="designer.setZoom"
      />
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
    </div>
    <PropertyPanel
      :element="designer.selected.value"
      @update="onUpdate"
      @remove="onRemove"
    />
  </div>
</template>

<script setup lang="ts">
import type { Element, ElementType, Template } from '../core/types'
import { useDesigner } from '../api/useDesigner'
import { alignHorizontal, alignVertical, type HorizontalAlign, type VerticalAlign } from '../core/align'
import { printTemplate } from '../utils/print'
import ElementPalette from './ElementPalette.vue'
import DesignerCanvas from './DesignerCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import CanvasToolbar from './CanvasToolbar.vue'

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
}>()

const designer = useDesigner({ template: props.initialTemplate })

function onAdd(type: ElementType) {
  designer.add(type)
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

function onClear() {
  designer.clearElements()
}

async function onPrint() {
  const ok = await printTemplate(designer.template.value, props.printData)
  if (ok) emit('printOk')
  else emit('printError')
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
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #f5f5f5;
}
.canvas-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
</style>
