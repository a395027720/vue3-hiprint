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
        </div>

        <!-- 选中元素的 handle 层(独立于 .canvas-element,避免受 rotate 影响) -->
        <template v-if="selectedEl">
          <button
            class="el-remove"
            title="删除元素"
            :style="elRemoveStyle"
            @mousedown.stop
            @click.stop="$emit('remove', selectedEl.id)"
          >×</button>
          <span
            v-for="h in resizeHandles"
            :key="h.dir"
            class="resize-handle"
            :class="`rh-${h.kind} rh-${h.dir}`"
            :style="handleStyle(selectedEl, h.dir)"
            @mousedown.stop="onResizeStart($event, selectedEl.id, h.dir)"
          />
          <span
            class="rotate-line"
            :style="rotateLineStyle"
            @mousedown.stop="onRotateStart($event, selectedEl.id)"
          />
          <span
            class="rotate-handle"
            :style="rotateHandleStyle"
            title="拖动旋转"
            @mousedown.stop="onRotateStart($event, selectedEl.id)"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 2.5a5.5 5.5 0 1 0 5.45 6.3.85.85 0 0 0-1.69-.18 3.8 3.8 0 1 1-1-3.7l-1.3 1.3a.6.6 0 0 0 .42 1.03h3.5a.6.6 0 0 0 .6-.6V3.15a.6.6 0 0 0-1.03-.42l-1.1 1.1A5.48 5.48 0 0 0 8 2.5Z"
              />
            </svg>
          </span>
        </template>

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
  /** 元素被 resize(连续触发),patch 含 x/y/w/h */
  resize: [id: string, patch: { x: number; y: number; w: number; h: number }]
  /** 元素被旋转(连续触发) */
  rotate: [id: string, deg: number]
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

/** 当前选中元素(handle 层需要) */
const selectedEl = computed<Element | null>(() =>
  props.selectedId ? props.template.elements.find((e) => e.id === props.selectedId) ?? null : null,
)

function elBox(el: Element) {
  return {
    left: mmToPxScaled(el.x) + 'px',
    top: mmToPxScaled(el.y) + 'px',
    width: mmToPxScaled(el.w) + 'px',
    height: mmToPxScaled(el.h) + 'px',
    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
    transformOrigin: 'center',
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

// ========== Resize / Rotate ==========

type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const MIN_SIZE_MM = 4

const resizeHandles: Array<{ dir: ResizeDir; kind: 'corner' | 'edge' }> = [
  { dir: 'nw', kind: 'corner' },
  { dir: 'n', kind: 'edge' },
  { dir: 'ne', kind: 'corner' },
  { dir: 'e', kind: 'edge' },
  { dir: 'se', kind: 'corner' },
  { dir: 's', kind: 'edge' },
  { dir: 'sw', kind: 'corner' },
  { dir: 'w', kind: 'edge' },
]

/** 计算单个 handle 的位置/光标(绝对像素,handle 在 canvas 坐标系下作为兄弟节点)。
 *  角 handle 用 10x10 框(L 在框内),边 handle 用 14x3 / 3x14 短条,
 *  所以 offset 不同(corner = 5,edge-横 = 7x1.5,edge-竖 = 1.5x7)。
 */
function handleStyle(el: Element, dir: ResizeDir) {
  const isCorner = dir === 'nw' || dir === 'ne' || dir === 'sw' || dir === 'se'
  const isHorizontal = dir === 'n' || dir === 's'
  const offX = isCorner ? 5 : isHorizontal ? 7 : 1.5
  const offY = isCorner ? 5 : isHorizontal ? 1.5 : 7
  const posMap: Record<ResizeDir, { fx: number; fy: number; cursor: string }> = {
    nw: { fx: 0, fy: 0, cursor: 'nwse-resize' },
    n: { fx: 0.5, fy: 0, cursor: 'ns-resize' },
    ne: { fx: 1, fy: 0, cursor: 'nesw-resize' },
    e: { fx: 1, fy: 0.5, cursor: 'ew-resize' },
    se: { fx: 1, fy: 1, cursor: 'nwse-resize' },
    s: { fx: 0.5, fy: 1, cursor: 'ns-resize' },
    sw: { fx: 0, fy: 1, cursor: 'nesw-resize' },
    w: { fx: 0, fy: 0.5, cursor: 'ew-resize' },
  }
  const p = posMap[dir]
  return {
    left: (mmToPxScaled(el.x) + p.fx * mmToPxScaled(el.w) - offX) + 'px',
    top: (mmToPxScaled(el.y) + p.fy * mmToPxScaled(el.h) - offY) + 'px',
    cursor: p.cursor,
  }
}

/** 删除按钮(右上角外侧,让出 ne resize handle 的位置) */
const elRemoveStyle = computed(() => {
  const e = selectedEl.value
  if (!e) return {}
  return {
    left: (mmToPxScaled(e.x + e.w) + 4) + 'px',
    top: (mmToPxScaled(e.y) - 20) + 'px',
  }
})

/** 旋转连杆线(元素顶边中点 → 旋转手柄) */
const rotateLineStyle = computed(() => {
  const e = selectedEl.value
  if (!e) return {}
  const x = mmToPxScaled(e.x) + mmToPxScaled(e.w) / 2
  const y1 = mmToPxScaled(e.y)
  const y2 = mmToPxScaled(e.y) - 20
  return {
    left: (x - 0.5) + 'px',
    top: y1 + 'px',
    width: '1px',
    height: (y2 - y1) + 'px',
  }
})

/** 旋转手柄圆点 */
const rotateHandleStyle = computed(() => {
  const e = selectedEl.value
  if (!e) return {}
  return {
    left: (mmToPxScaled(e.x) + mmToPxScaled(e.w) / 2 - 9) + 'px',
    top: (mmToPxScaled(e.y) - 30) + 'px',
  }
})

/**
 * 启动 resize 拖拽。
 * 用元素盒的屏幕坐标 + 鼠标增量来反推新 x/y/w/h(保证 zoom 下视觉一致),
 * mouseup 提交最终值。Shift 修饰键在角 handle 上保持等比。
 */
function onResizeStart(e: MouseEvent, id: string, dir: ResizeDir) {
  e.preventDefault()
  const tpl = props.template
  const idx = tpl.elements.findIndex((x) => x.id === id)
  if (idx < 0) return
  const el = tpl.elements[idx]
  const startMouseX = e.clientX
  const startMouseY = e.clientY
  const origX = el.x
  const origY = el.y
  const origW = el.w
  const origH = el.h
  const pxPerMmLocal = mmToPx(1) * zoomValue.value
  const ratio = origW / origH
  const isCorner = dir === 'nw' || dir === 'ne' || dir === 'sw' || dir === 'se'

  function onMove(ev: MouseEvent) {
    const dxMm = (ev.clientX - startMouseX) / pxPerMmLocal
    const dyMm = (ev.clientY - startMouseY) / pxPerMmLocal
    const shift = ev.shiftKey && isCorner
    let x = origX
    let y = origY
    let w = origW
    let h = origH
    // 横向(对 w / x 起作用的方向)
    if (dir === 'nw' || dir === 'w' || dir === 'sw') {
      w = Math.max(MIN_SIZE_MM, origW - dxMm)
      x = origX + (origW - w)
    } else if (dir === 'ne' || dir === 'e' || dir === 'se') {
      w = Math.max(MIN_SIZE_MM, origW + dxMm)
    }
    // 纵向(对 h / y 起作用的方向)
    if (dir === 'nw' || dir === 'n' || dir === 'ne') {
      h = Math.max(MIN_SIZE_MM, origH - dyMm)
      y = origY + (origH - h)
    } else if (dir === 'sw' || dir === 's' || dir === 'se') {
      h = Math.max(MIN_SIZE_MM, origH + dyMm)
    }
    // Shift 等比
    if (shift) {
      if (dir === 'nw' || dir === 'ne' || dir === 'se' || dir === 'sw') {
        const newH = w / ratio
        if (dir === 'nw' || dir === 'ne') y = origY + (origH - newH)
        h = newH
      }
    }
    emit('resize', id, { x, y, w, h })
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

/**
 * 启动旋转拖拽。
 * 用元素在未旋转时的几何中心(由 x/y/w/h 算出)作为旋转中心,
 * 计算鼠标相对中心的 atan2 → 度数。+90° 偏移让"拖柄朝正上方"对应 0°。
 *
 * 用 canvas 的实际 bounding rect 把元素中心转屏幕坐标,这样不受 wrap padding /
 * pan / scroll 影响。
 */
function onRotateStart(e: MouseEvent, id: string) {
  e.preventDefault()
  const tpl = props.template
  const idx = tpl.elements.findIndex((x) => x.id === id)
  if (idx < 0) return
  const el = tpl.elements[idx]
  // canvas-frame 在 .canvas-wrap 内,wrap padding 24 + canvas top:24 left:24
  const wrap = (e.currentTarget as HTMLElement).closest('.canvas-wrap') as HTMLElement | null
  if (!wrap) return
  const wrapRect = wrap.getBoundingClientRect()
  // canvas-frame 用了 transform(pan),所以 rect 已经反映了 pan
  const frameEl = wrap.querySelector('.canvas-frame') as HTMLElement | null
  if (!frameEl) return
  const frameRect = frameEl.getBoundingClientRect()
  // 元素未旋转中心(屏幕坐标) = frameRect.left + 24(canvas left 偏移) + (x + w/2) * pxPerMm
  const cx = frameRect.left + 24 + mmToPxScaled(el.x + el.w / 2)
  const cy = frameRect.top + 24 + mmToPxScaled(el.y + el.h / 2)
  // wrapRect 暂未用到,留作 fallback
  void wrapRect

  function onMove(ev: MouseEvent) {
    const dx = ev.clientX - cx
    const dy = ev.clientY - cy
    // atan2(dy, dx) 是从 x 轴正方向逆时针的角度;CSS rotate 顺时针为正
    const deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    emit('rotate', id, Math.round(deg))
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
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
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  background: #ff4d4f;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  z-index: 102;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: background 120ms, transform 120ms;
}
.el-remove:hover {
  background: #ff7875;
  transform: scale(1.1);
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

/* ========== Resize / Rotate handles ==========
   角 handle(corner):18x18 框 + 内部 L 形(10x3 横 + 3x10 竖)圆角条,参考 Vue-Print-Designer
   边 handle(edge):12x3 短条,方向决定横/竖
   旋转 handle:圆点 + 连线
*/
.resize-handle {
  position: absolute;
  pointer-events: auto;
  z-index: 100;
  background: transparent;
}
/* ---------- 角 handle:L 形(横 + 竖) ---------- */
.rh-corner {
  width: 10px;
  height: 10px;
}
.rh-corner::before,
.rh-corner::after {
  content: '';
  position: absolute;
  background: #1890ff;
  border-radius: 1.5px;
  opacity: 0.9;
  transition: opacity 120ms;
}
.rh-corner:hover::before,
.rh-corner:hover::after {
  opacity: 1;
}
/* 横条(顶部或底部) */
.rh-corner::before {
  left: 0;
  width: 10px;
  height: 3px;
}
/* 竖条(左侧或右侧) */
.rh-corner::after {
  top: 0;
  width: 3px;
  height: 10px;
}
/* 角 handle 的 L 角点位置 */
.rh-nw::before { top: 0; }
.rh-nw::after { left: 0; }
.rh-ne::before { top: 0; right: 0; left: auto; }
.rh-ne::after { right: 0; top: 0; }
.rh-se::before { bottom: 0; top: auto; }
.rh-se::after { right: 0; bottom: 0; top: auto; }
.rh-sw::before { bottom: 0; top: auto; }
.rh-sw::after { left: 0; bottom: 0; top: auto; }

/* ---------- 边 handle:单方向短条 ---------- */
.rh-edge {
  background: #1890ff;
  border-radius: 1.5px;
  opacity: 0.85;
  transition: opacity 120ms, transform 120ms;
}
.rh-edge:hover {
  opacity: 1;
  transform: scale(1.2);
}
/* 上下边:横条 */
.rh-n,
.rh-s {
  width: 14px;
  height: 3px;
}
/* 左右边:竖条 */
.rh-e,
.rh-w {
  width: 3px;
  height: 14px;
}
.rotate-line {
  position: absolute;
  background: #1890ff;
  opacity: 0.75;
  pointer-events: auto;
  z-index: 100;
}
.rotate-handle {
  position: absolute;
  width: 18px;
  height: 18px;
  background: #1890ff;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  cursor: crosshair;
  z-index: 101;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 120ms, box-shadow 120ms;
}
.rotate-handle:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.25), 0 2px 4px rgba(0, 0, 0, 0.3);
}
</style>
