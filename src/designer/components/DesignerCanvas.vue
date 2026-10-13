<template>
  <div
    class="canvas-wrap"
    :class="{ 'pan-mode': panMode }"
    @click.self="$emit('select', null)"
    @mousedown="onWrapMouseDown"
  >
    <div class="canvas-frame" :style="frameStyleWithPan">
      <!-- 水平标尺 -->
      <svg
        class="ruler ruler-h"
        :width="frameStyle.width"
        height="24"
        :viewBox="`0 0 ${frameStyle.widthPx} 24`"
      >
        <line
          v-for="t in hTicks"
          :key="`h-${t.mm}`"
          :x1="t.x"
          :x2="t.x"
          y1="16"
          :y2="t.major ? 6 : 12"
          stroke="#bbb"
          stroke-width="1"
        />
        <text
          v-for="t in hTicks"
          :key="`ht-${t.mm}`"
          v-show="t.major"
          :x="t.x + 2"
          y="11"
          font-size="9"
          fill="#888"
        >{{ t.mm }}</text>
      </svg>

      <!-- 垂直标尺 -->
      <svg
        class="ruler ruler-v"
        width="24"
        :height="frameStyle.height"
        :viewBox="`0 0 24 ${frameStyle.heightPx}`"
      >
        <line
          v-for="t in vTicks"
          :key="`v-${t.mm}`"
          x1="16"
          :y1="t.x"
          x2="6"
          :y2="t.x"
          stroke="#bbb"
          stroke-width="1"
        />
        <text
          v-for="t in vTicks"
          :key="`vt-${t.mm}`"
          v-show="t.major"
          x="2"
          :y="t.x + 8"
          font-size="9"
          fill="#888"
        >{{ t.mm }}</text>
      </svg>

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
          :style="{ left: mmToPxScaled(x) + 'px' }"
        />
        <div
          v-for="y in snapLines.horizontal"
          :key="`h-${y}`"
          class="snap-line snap-h"
          :style="{ top: mmToPxScaled(y) + 'px' }"
        />
      </div>
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
  /** 画布缩放(1 = 100%,0.5 = 50%) */
  zoom?: number
  /** 是否显示 5mm 网格 */
  showGrid?: boolean
  /** 手型拖动模式(空格 / 工具条按钮) */
  panMode?: boolean
  /** 画布横向偏移(由父组件控制) */
  panX?: number
  /** 画布纵向偏移 */
  panY?: number
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
  /** 画布被拖动(连续触发) */
  pan: [dx: number, dy: number]
}>()

// 吸附阈值(单位:mm,4px / 3.78 ≈ 1mm,这里取 1mm 适中)
const SNAP_THRESHOLD_MM = 1

const zoomValue = computed(() => props.zoom ?? 1)

/** mm → 画布 px(已应用 zoom) */
function mmToPxScaled(mm: number): number {
  return mmToPx(mm) * zoomValue.value
}

/** 5mm 网格背景:横竖各画一道浅灰 1px 线,间距 5mm。showGrid=false 时透明 */
const gridStyle = computed(() => {
  if (!props.showGrid) return { image: 'none', size: '' }
  const step = mmToPxScaled(5)
  return {
    image: [
      `linear-gradient(to right, #e0e0e0 1px, transparent 1px)`,
      `linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)`,
    ].join(','),
    size: `${step}px ${step}px`,
  }
})

const canvasStyle = computed(() => ({
  width: mmToPxScaled(props.template.paper.width) + 'px',
  height: mmToPxScaled(props.template.paper.height) + 'px',
  backgroundImage: gridStyle.value.image,
  backgroundSize: gridStyle.value.size || undefined,
}))

/** 标尺 + 画布整体框的尺寸(画布尺寸 + 左右上下 24 标尺留白) */
const frameStyle = computed(() => {
  const w = mmToPxScaled(props.template.paper.width)
  const h = mmToPxScaled(props.template.paper.height)
  return {
    width: w + 'px',
    height: h + 'px',
    widthPx: w,
    heightPx: h,
  }
})

/** 带 pan 偏移的 frame style(用 CSS translate 整体平移画布+标尺) */
const frameStyleWithPan = computed(() => ({
  ...frameStyle.value,
  transform: `translate(${props.panX ?? 0}px, ${props.panY ?? 0}px)`,
}))

/** 画布 wrap 上的 mousedown:panMode 时启动平移拖动 */
function onWrapMouseDown(e: MouseEvent) {
  if (!props.panMode) return
  // 仅在 wrap 空白处启动(不响应冒泡自元素上的 mousedown)
  if (e.target !== e.currentTarget) return
  e.preventDefault()
  const startX = e.clientX
  const startY = e.clientY
  const baseX = props.panX ?? 0
  const baseY = props.panY ?? 0
  function onMove(ev: MouseEvent) {
    emit('pan', (baseX + (ev.clientX - startX)) - (props.panX ?? 0), (baseY + (ev.clientY - startY)) - (props.panY ?? 0))
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

/**
 * 刻度数组:每 5mm 一个 minor,每 10mm 一个 major(带数字)。
 * 数字从 -10mm 开始延伸到 paper.width + 10,模拟"画布外的世界"。
 */
const RULER_MAJOR = 10
const RULER_MINOR = 5
const RULER_PAD = 10 // mm

function buildTicks(axisLen: number): Array<{ mm: number; x: number; major: boolean }> {
  const ticks: Array<{ mm: number; x: number; major: boolean }> = []
  const start = -RULER_PAD
  const end = axisLen + RULER_PAD
  for (let mm = start; mm <= end; mm += RULER_MINOR) {
    const x = mmToPxScaled(mm)
    const major = mm % RULER_MAJOR === 0
    if (major || Math.abs(mm) % RULER_MINOR === 0) {
      ticks.push({ mm, x, major })
    }
  }
  return ticks
}

const hTicks = computed(() => buildTicks(props.template.paper.width))
const vTicks = computed(() => buildTicks(props.template.paper.height))

const snapLines = reactive<{ vertical: number[]; horizontal: number[] }>({
  vertical: [],
  horizontal: [],
})

function elBox(el: Element) {
  return {
    left: mmToPxScaled(el.x) + 'px',
    top: mmToPxScaled(el.y) + 'px',
    width: mmToPxScaled(el.w) + 'px',
    height: mmToPxScaled(el.h) + 'px',
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
  // mousemove 像素 → mm,需除以 zoom 让缩放下视觉拖动距离一致
  const pxPerMmLocal = mmToPx(1) * zoomValue.value
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
.canvas-wrap.pan-mode {
  cursor: grab;
}
.canvas-wrap.pan-mode:active {
  cursor: grabbing;
}
.canvas-frame {
  position: relative;
  flex-shrink: 0;
}
.ruler {
  position: absolute;
  background: #fafafa;
  display: block;
  pointer-events: none;
}
.ruler-h {
  top: 0;
  left: 24px;
  height: 24px;
  border-bottom: 1px solid #e0e0e0;
  border-left: 1px solid #e0e0e0;
}
.ruler-v {
  top: 24px;
  left: 0;
  width: 24px;
  border-right: 1px solid #e0e0e0;
  border-top: 1px solid #e0e0e0;
}
.canvas {
  position: absolute;
  top: 24px;
  left: 24px;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.canvas-element {
  position: absolute;
  border: 1px dashed #c0c4cc;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
  /* 默认 visible,让外凸的删除叉子能漏出来 */
  background: transparent;
  transition: background 120ms, border-color 120ms;
}
.canvas-element.is-image {
  /* image 需要裁剪溢出 */
  overflow: hidden;
}
.canvas-element:hover {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}
.canvas-element.selected {
  border: 1px solid #1890ff;
  background: rgba(24, 144, 255, 0.1);
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
