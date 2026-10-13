<template>
  <div class="print-designer">
    <ElementPalette @add="onAdd" />
    <DesignerCanvas
      :template="designer.template.value"
      :selected-id="designer.selectedId.value"
      @add="onAdd"
      @select="designer.select"
      @move="onMove"
      @remove="onRemove"
    />
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
import ElementPalette from './ElementPalette.vue'
import DesignerCanvas from './DesignerCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'

const props = defineProps<{
  initialTemplate?: Template
}>()

const emit = defineEmits<{
  /** designer.loadJson 失败 */
  jsonImportError: [raw: string]
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

// 暴露给父组件:打印 / 导入导出
defineExpose({
  designer,
  toJson: () => designer.toJson(),
  loadJson: (raw: string) => {
    const ok = designer.loadJson(raw)
    if (!ok) emit('jsonImportError', raw)
    return ok
  },
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
</style>
