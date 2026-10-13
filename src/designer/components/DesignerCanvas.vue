<template>
  <div class="canvas-wrap" @click.self="$emit('select', null)">
    <div
      class="canvas"
      :style="canvasStyle"
      @dragover.prevent
      @drop="onDrop"
    >
      <div
        v-for="el in template.elements"
        :key="el.id"
        class="canvas-element"
        :class="{ selected: el.id === selectedId, 'is-image': el.type === 'image' }"
        :style="elBox(el)"
        @mousedown="onElementMouseDown($event, el.id)"
      >
        <ElementRenderer :element="el" />
        <button
          v-if="el.id === selectedId"
          class="el-remove"
          title="删除元素"
          @mousedown.stop
          @click.stop="$emit('remove', el.id)"
        >×</button>
      </div>

      <!-- 吸附辅助线 -->
      <div
        v-for="x in snapLines.vertical"
        :key="`v-${x}`"
        class="snap-line snap-v"
        :style="{ left: mmToPx(x) + 'px' }"
      />
      <div
        v-for="y in snapLines.horizontal"
        :key="`h-${y}`"
        class="snap-line snap-h"
        :style="{ top: mmToPx(y) + 'px' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { Element, ElementType, Template } from '../core/types'
import { mmToPx } from '../core/render'
import { snapValue } from '../utils/snap'
import ElementRenderer from './ElementRenderer.vue'

const props = defineProps<{
  template: Template
  selectedId: string | null
}>()

const emit = defineEmits<{
  /** palette 拖入或点击 add */
  add: [type: ElementType]
  /** 选中元素 id(传 null 取消选中) */
  select: [id: string | null]
  /** 元素被拖动(连续触发) */
  move: [id: string, x: number, y: number]
  /** 删除元素 */
  remove: [id: string]
}>()

// 吸附阈值(单位:mm,4px / 3.78 ≈ 1mm,这里取 1mm 适中)
const SNAP_THRESHOLD_MM = 1

const canvasStyle = computed(() => ({
  width: mmToPx(props.template.paper.width) + 'px',
  height: mmToPx(props.template.paper.height) + 'px',
}))

const snapLines = reactive<{ vertical: number[]; horizontal: number[] }>({
  vertical: [],
  horizontal: [],
})

function elBox(el: Element) {
  return {
    left: mmToPx(el.x) + 'px',
    top: mmToPx(el.y) + 'px',
    width: mmToPx(el.w) + 'px',
    height: mmToPx(el.h) + 'px',
  }
}

function onDrop(e: DragEvent) {
  const type = e.dataTransfer?.getData('text/plain') as ElementType
  if (type) emit('add', type)
}

/**
 * 收集某个轴上的 snap 候选:画布 0/边界 + 其它元素的 4 条边
 */
function collectCandidates(
  axis: 'x' | 'y',
  excludeId: string,
): number[] {
  const tpl = props.template
  const list: number[] = axis === 'x'
    ? [0, tpl.paper.width]
    : [0, tpl.paper.height]
  for (const e of tpl.elements) {
    if (e.id === excludeId) continue
    if (axis === 'x') {
      list.push(e.x, e.x + e.w)
    } else {
      list.push(e.y, e.y + e.h)
    }
  }
  return list
}

function onElementMouseDown(e: MouseEvent, id: string) {
  emit('select', id)
  const el = props.template.elements.find((x) => x.id === id)
  if (!el) return
  const startX = e.clientX
  const startY = e.clientY
  const origX = el.x
  const origY = el.y
  const pxPerMmLocal = mmToPx(1)
  const vCandidates = collectCandidates('x', id)
  const hCandidates = collectCandidates('y', id)

  function onMove(ev: MouseEvent) {
    const dx = (ev.clientX - startX) / pxPerMmLocal
    const dy = (ev.clientY - startY) / pxPerMmLocal
    let newX = Math.max(0, origX + dx)
    let newY = Math.max(0, origY + dy)
    const newRight = newX + el.w
    const newBottom = newY + el.h

    // 4 条边都参与吸附
    const sxLeft = snapValue(newX, vCandidates, SNAP_THRESHOLD_MM)
    const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM)
    const syTop = snapValue(newY, hCandidates, SNAP_THRESHOLD_MM)
    const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM)

    // 优先吸附 left/right,再 top/bottom
    if (sxLeft.lineAt !== null) newX = sxLeft.value
    else if (sxRight.lineAt !== null) newX = sxRight.value - el.w

    if (syTop.lineAt !== null) newY = syTop.value
    else if (syBottom.lineAt !== null) newY = syBottom.value - el.h

    // 收集辅助线
    const vLines = [sxLeft.lineAt, sxRight.lineAt].filter((v): v is number => v !== null)
    const hLines = [syTop.lineAt, syBottom.lineAt].filter((v): v is number => v !== null)
    snapLines.vertical = vLines
    snapLines.horizontal = hLines

    emit('move', id, newX, newY)
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    snapLines.vertical = []
    snapLines.horizontal = []
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.canvas-wrap {
  flex: 1;
  background: #ececec;
  padding: 24px;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.canvas {
  background: white;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.canvas-element {
  position: absolute;
  border: 1px dashed #bbb;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
  /* 默认 visible,让外凸的删除叉子能漏出来 */
  background: transparent;
}
.canvas-element.is-image {
  /* image 需要裁剪溢出 */
  overflow: hidden;
}
.canvas-element:hover {
  border-color: #1890ff;
}
.canvas-element.selected {
  border: 1px solid #1890ff;
  outline: 1px solid #1890ff;
  outline-offset: -2px;
}
.el-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 16px;
  height: 16px;
  padding: 0;
  line-height: 14px;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  background: #ff4d4f;
  border: 1px solid #fff;
  border-radius: 2px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.el-remove:hover {
  background: #ff7875;
}
/* 吸附辅助线 */
.snap-line {
  position: absolute;
  background: #ff4d4f;
  pointer-events: none;
  z-index: 9999;
}
.snap-v {
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-0.5px);
}
.snap-h {
  left: 0;
  right: 0;
  height: 1px;
  transform: translateY(-0.5px);
}
</style>
