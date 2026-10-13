<template>
  <div
    class="canvas-wrap"
    :class="{ 'pan-mode': panMode }"
    @mousedown="onWrapMouseDown"
    @contextmenu.prevent="onWrapContextMenu"
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
          :class="{
            selected: el.id === selectedId,
            'is-image': el.type === 'image',
            locked: el.locked,
            'multi-selected': isMultiSelected(el.id) && el.id !== selectedId,
            'marquee-hit': marqueeHits.has(el.id),
          }"
          :style="elBox(el)"
          @mousedown="onElementMouseDown($event, el.id)"
          @contextmenu.prevent.stop="onContextMenu($event, el.id)"
        >
          <ElementRenderer :element="el" />
          <span v-if="el.locked" class="lock-badge" title="已锁定">🔒</span>
          <!-- 选中元素的 handle 层(放在 .canvas-element 内,跟着 rotate 一起转) -->
          <template v-if="el.id === selectedId && !el.locked">
            <span
              v-for="h in resizeHandles"
              :key="h.dir"
              class="resize-handle"
              :class="`rh-${h.kind} rh-${h.dir}`"
              :style="handleStyle(el, h.dir)"
              @mousedown.stop="onResizeStart($event, el.id, h.dir)"
            />
            <span
              class="rotate-line"
              :style="rotateLineStyle"
              @mousedown.stop="onRotateStart($event, el.id)"
            />
            <span
              class="rotate-handle"
              :style="rotateHandleStyleReversed(el)"
              title="拖动旋转"
              @mousedown.stop="onRotateStart($event, el.id)"
            >
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 2.5a5.5 5.5 0 1 0 5.45 6.3.85.85 0 0 0-1.69-.18 3.8 3.8 0 1 1-1-3.7l-1.3 1.3a.6.6 0 0 0 .42 1.03h3.5a.6.6 0 0 0 .6-.6V3.15a.6.6 0 0 0-1.03-.42l-1.1 1.1A5.48 5.48 0 0 0 8 2.5Z"
                />
              </svg>
            </span>
            <span class="rotate-deg" :style="rotateDegStyle(el)">{{ el.rotate ?? 0 }}°</span>
          </template>
        </div>

        <!-- 框选矩形(屏幕坐标,覆盖在 .canvas 上) -->
        <div
          v-if="marquee"
          class="marquee-rect"
          :style="marqueeStyle"
        >
          <span v-if="marquee.w >= 4 && marquee.h >= 4" class="marquee-size">
            {{ formatMm(marquee.wMm) }} × {{ formatMm(marquee.hMm) }} mm
          </span>
        </div>
      </div>

      <!-- 吸附辅助线:放在 frame 层级,top/bottom = 0 让竖线贯穿 frame 高度
           (含 ruler 区域),left/top 加 24px 偏移对齐到 canvas 内坐标。
           ruler z-index 比 snap-line 高,故 ruler 区域内的线被 ruler 盖住。 -->
      <div
        v-for="x in snapLines.vertical"
        :key="`v-${x}`"
        class="snap-line snap-v"
        :style="{ left: (24 + mmToPxScaled(x)) + 'px' }"
      />
      <div
        v-for="y in snapLines.horizontal"
        :key="`h-${y}`"
        class="snap-line snap-h"
        :style="{ top: (24 + mmToPxScaled(y)) + 'px' }"
      />

      <!-- 多选组的 4 边对齐线(框选后静态显示,延伸到 ruler) -->
      <template v-if="multiGroupLines">
        <div
          v-for="x in multiGroupLines.v"
          :key="`mg-v-${x}`"
          class="snap-line snap-v multi-group"
          :style="{ left: (24 + mmToPxScaled(x)) + 'px' }"
        />
        <div
          v-for="y in multiGroupLines.h"
          :key="`mg-h-${y}`"
          class="snap-line snap-h multi-group"
          :style="{ top: (24 + mmToPxScaled(y)) + 'px' }"
        />
      </template>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :open="ctxMenu.open"
      :pos="ctxMenu.pos"
      :element="computedMenuEl"
      :has-selection="!!computedMenuEl"
      :has-clipboard="!!props.hasClipboard"
      :can-undo="!!props.canUndo"
      :can-redo="!!props.canRedo"
      :can-bring-to-front="canBringToFront"
      :can-send-to-back="canSendToBack"
      :can-move-up="canMoveUp"
      :can-move-down="canMoveDown"
      @close="closeCtxMenu"
      @remove="onCtxRemove"
      @copy="onCtxCopy"
      @cut="onCtxCut"
      @paste="onCtxPaste"
      @bring-to-front="onCtxBringToFront"
      @send-to-back="onCtxSendToBack"
      @move-up="onCtxMoveUp"
      @move-down="onCtxMoveDown"
      @toggle-lock="onCtxToggleLock"
      @undo="onCtxUndo"
      @redo="onCtxRedo"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Element, ElementType, Template } from '../core/types'
import { mmToPx } from '../core/render'
import { snapValue } from '../utils/snap'
import ElementRenderer from './ElementRenderer.vue'
import ContextMenu from './ContextMenu.vue'

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
  /** 内部剪贴板是否有元素(右键菜单 "粘贴" 是否可用) */
  hasClipboard?: boolean
  /** 撤销是否可用 */
  canUndo?: boolean
  /** 重做是否可用 */
  canRedo?: boolean
  /** 多选 id 列表(单选时也含 1 个) */
  multiSelectedIds?: string[]
}>()

const emit = defineEmits<{
  /** palette 拖入或点击 add */
  add: [type: ElementType]
  /** 选中元素 id(传 null 取消选中) */
  select: [id: string | null]
  /** 框选结束:批量选中 */
  selectMany: [ids: string[]]
  /** Shift+点击元素:在多选集合里 toggle */
  selectToggle: [id: string]
  /** 元素被拖动(连续触发) */
  move: [id: string, x: number, y: number]
  /** 多选组拖动(连续触发) */
  moveMany: [updates: Array<{ id: string; x: number; y: number }>]
  /** 元素被 resize(连续触发),patch 含 x/y/w/h */
  resize: [id: string, patch: { x: number; y: number; w: number; h: number }]
  /** 元素被旋转(连续触发) */
  rotate: [id: string, deg: number]
  /** 删除元素 */
  remove: [id: string]
  /** 批量删除(多选时 Delete 键) */
  removeMany: [ids: string[]]
  /** 画布被拖动(连续触发) */
  pan: [dx: number, dy: number]
  /** 右键菜单 / 按钮触发(粘贴时携带鼠标 mm 坐标,父组件用) */
  ctxAction: [
    action:
      | 'copy' | 'cut' | 'paste'
      | 'bringToFront' | 'sendToBack' | 'moveUp' | 'moveDown'
      | 'toggleLock' | 'undo' | 'redo',
    payload?: { id?: string; x?: number; y?: number },
  ]
}>()

// 吸附阈值(单位:mm,4px / 3.78 ≈ 1mm,这里取 1mm 适中)
const SNAP_THRESHOLD_MM = 1

const zoomValue = computed(() => props.zoom ?? 1)

/** mm → 画布 px(已应用 zoom) */
function mmToPxScaled(mm: number): number {
  return mmToPx(mm) * zoomValue.value
}

/** 屏幕像素 → mm(用于框选时把屏幕距离转 mm) */
const pxPerMmScreen = computed(() => mmToPx(1) * zoomValue.value)

// ========== 框选 / 多选 ==========

/** 框选矩形(屏幕像素坐标),null = 不在框选 */
const marquee = ref<{
  x1: number; y1: number; x2: number; y2: number
  w: number; h: number; wMm: number; hMm: number
} | null>(null)

/** 框选过程中实时命中的元素 id(用于实时高亮) */
const marqueeHits = ref<Set<string>>(new Set())

/** 框选启动瞬间的标志:防止 onDocMouseDown 同帧把多选清空 */
const marqueeStarting = ref(false)

/** 当前 multi 集合(含主选) */
const multiIds = computed<Set<string>>(() => new Set(props.multiSelectedIds ?? []))

function isMultiSelected(id: string): boolean {
  return multiIds.value.has(id)
}

/** 把 mm 数保留 1 位小数 */
function formatMm(mm: number): string {
  return mm.toFixed(1).replace(/\.0$/, '')
}

/** 框选矩形的渲染样式:.marquee-rect 是 .canvas 的子元素,
 *  left/top 用 canvas 内的相对像素(屏幕 clientX - canvas.left) */
const marqueeStyle = computed(() => {
  const m = marquee.value
  if (!m) return {}
  const canvas = document.querySelector('.canvas') as HTMLElement | null
  if (!canvas) return {}
  const cr = canvas.getBoundingClientRect()
  return {
    left: (m.x1 - cr.left) + 'px',
    top: (m.y1 - cr.top) + 'px',
    width: m.w + 'px',
    height: m.h + 'px',
  }
})

/** 元素在屏幕坐标系下的 AABB(已应用 zoom,未考虑 rotate——旋转元素的 AABB 会偏大,框选命中范围更宽容,可接受) */
function elScreenRect(el: Element): { left: number; top: number; right: number; bottom: number } | null {
  const canvas = document.querySelector('.canvas') as HTMLElement | null
  if (!canvas) return null
  const cr = canvas.getBoundingClientRect()
  const px = mmToPxScaled(el.w)
  const py = mmToPxScaled(el.h)
  return {
    left: cr.left + mmToPxScaled(el.x),
    top: cr.top + mmToPxScaled(el.y),
    right: cr.left + mmToPxScaled(el.x) + px,
    bottom: cr.top + mmToPxScaled(el.y) + py,
  }
}

/** 框选过程中实时算命中元素(每帧更新 marqueeHits,用于实时高亮) */
watch(marquee, (m) => {
  if (!m) {
    marqueeHits.value = new Set()
    return
  }
  const hits = new Set<string>()
  for (const el of props.template.elements) {
    if (el.locked) continue
    const r = elScreenRect(el)
    if (!r) continue
    if (m.x1 <= r.right && m.x2 >= r.left && m.y1 <= r.bottom && m.y2 >= r.top) {
      hits.add(el.id)
    }
  }
  marqueeHits.value = hits
})

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

/** 画布 wrap 上的 mousedown:
 *  - panMode 时启动平移拖动
 *  - 否则在 .canvas 空白处启动框选(非元素 / 非 handle)
 *  注意:shift 按下时走元素自己的 toggle 分支(元素 mousedown 自行处理),
 *  不在这里启动框选。 */
function onWrapMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (e.shiftKey) return
  // panMode:启动平移
  if (props.panMode) {
    if (target.closest('.canvas-element')) return
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
    return
  }
  // 元素 / handle / 菜单 / ruler 上不启动框选
  if (target.closest('.canvas-element')) return
  if (target.closest('.ctx-menu')) return
  // 框选必须落在画布纸上(.canvas),ruler / frame 留白处不启动(避免误框)
  if (!target.closest('.canvas') && !target.classList.contains('canvas')) return

  e.preventDefault()
  e.stopPropagation() // 阻止冒泡到 document 触发 onDocMouseDown 把多选清空
  // 启动时清掉单选/多选(进入"全新框选"模式)
  if (props.selectedId || (props.multiSelectedIds && props.multiSelectedIds.length > 0)) {
    emit('selectMany', [])
  }
  marqueeStarting.value = true
  queueMicrotask(() => { marqueeStarting.value = false })
  const startX = e.clientX
  const startY = e.clientY

  function onMove(ev: MouseEvent) {
    const x1 = Math.min(startX, ev.clientX)
    const y1 = Math.min(startY, ev.clientY)
    const x2 = Math.max(startX, ev.clientX)
    const y2 = Math.max(startY, ev.clientY)
    const ppm = pxPerMmScreen.value
    marquee.value = {
      x1, y1, x2, y2,
      w: x2 - x1,
      h: y2 - y1,
      wMm: (x2 - x1) / ppm,
      hMm: (y2 - y1) / ppm,
    }
  }
  function onUp(ev: MouseEvent) {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    const m = marquee.value
    if (!m) return
    // 鼠标没动:当作"点空白处"→ 清选中
    if (m.w < 3 && m.h < 3) {
      marquee.value = null
      marqueeHits.value = new Set()
      return
    }
    // 收集命中的元素 id(屏幕坐标相交,锁定元素除外)
    const hits: string[] = []
    for (const el of props.template.elements) {
      if (el.locked) continue
      const r = elScreenRect(el)
      if (!r) continue
      if (m.x1 <= r.right && m.x2 >= r.left && m.y1 <= r.bottom && m.y2 >= r.top) {
        hits.push(el.id)
      }
    }
    marquee.value = null
    marqueeHits.value = new Set()
    emit('selectMany', hits)
    void ev
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

/** 多选组的 bounding box 4 边(mm 坐标),用于画静态对齐线 + 组拖动时的吸附候选。
 *  框选后持续显示,直到选中集合变化;组拖动时跟 snapLines 一起更新(也会画吸附线)。 */
const multiGroupLines = computed<{ v: number[]; h: number[] } | null>(() => {
  const ids = props.multiSelectedIds ?? []
  if (ids.length < 2) return null
  const idSet = new Set(ids)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const e of props.template.elements) {
    if (!idSet.has(e.id)) continue
    if (e.x < minX) minX = e.x
    if (e.y < minY) minY = e.y
    if (e.x + e.w > maxX) maxX = e.x + e.w
    if (e.y + e.h > maxY) maxY = e.y + e.h
  }
  if (!Number.isFinite(minX)) return null
  return { v: [minX, maxX], h: [minY, maxY] }
})

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
  const el = props.template.elements.find((x) => x.id === id)
  if (!el) return
  // Shift+点击:在多选里 toggle,不发 selectMany(只是 toggle 1 个)
  if (e.shiftKey) {
    e.preventDefault()
    emit('selectToggle', id)
    return
  }
  // 多选组拖动:如果点中的元素在多选集合里,整组一起平移
  if (props.multiSelectedIds && props.multiSelectedIds.length > 1 && props.multiSelectedIds.includes(id)) {
    startGroupDrag(e, id)
    return
  }
  // 普通:单选(也清空多选)
  emit('select', id)
  if (el.locked) return
  startElementDrag(e, id)
}

/** 单元素拖动(原 onElementMouseDown 主体) */
function startElementDrag(e: MouseEvent, id: string) {
  const el = props.template.elements.find((x) => x.id === id)
  if (!el) return
  const startX = e.clientX
  const startY = e.clientY
  const origX = el.x
  const origY = el.y
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

    const sxLeft = snapValue(newX, vCandidates, SNAP_THRESHOLD_MM)
    const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM)
    const syTop = snapValue(newY, hCandidates, SNAP_THRESHOLD_MM)
    const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM)

    if (sxLeft.lineAt !== null) newX = sxLeft.value
    else if (sxRight.lineAt !== null) newX = sxRight.value - el.w
    if (syTop.lineAt !== null) newY = syTop.value
    else if (syBottom.lineAt !== null) newY = syBottom.value - el.h

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

/** 多选组拖动:点中元素如果在多选集合里,所有选中元素(锁定除外)一起平移,保持相对位置 */
function startGroupDrag(e: MouseEvent, primaryId: string) {
  const ids = (props.multiSelectedIds ?? []).filter((x) => x !== primaryId)
  ids.unshift(primaryId) // 主选放第一个(让吸附候选收集时排除自己)
  // 收集每个元素的起始位置
  const origs = ids
    .map((id) => {
      const el = props.template.elements.find((x) => x.id === id)
      return el ? { id, x: el.x, y: el.y, locked: !!el.locked } : null
    })
    .filter((x): x is { id: string; x: number; y: number; locked: boolean } => x !== null)
  const draggables = origs.filter((o) => !o.locked)
  if (draggables.length === 0) return
  const startX = e.clientX
  const startY = e.clientY
  const pxPerMmLocal = mmToPx(1) * zoomValue.value
  // 吸附候选:组 4 边作为"自己",跟其它元素(非组内)+ 画布边界做吸附
  // 组内元素互不吸附(组已经是一个整体)
  const groupX = origs.reduce((acc, o) => Math.min(acc, o.x), Infinity)
  const groupY = origs.reduce((acc, o) => Math.min(acc, o.y), Infinity)
  const groupRight = origs.reduce((acc, o) => Math.max(acc, o.x), -Infinity) + (draggables[0] ? props.template.elements.find((e) => e.id === draggables[0].id)?.w ?? 0 : 0)
  const groupBottom = origs.reduce((acc, o) => Math.max(acc, o.y), -Infinity) + (draggables[0] ? props.template.elements.find((e) => e.id === draggables[0].id)?.h ?? 0 : 0)
  // 用组原始 w/h(拖动过程中变化),这里 groupRight - groupX = 组原始宽
  const groupW = groupRight - groupX
  const groupH = groupBottom - groupY
  // 其它元素的边(排除组内全部 id)
  const vCandidates = collectCandidatesForGroup('x', new Set(origs.map((o) => o.id)))
  const hCandidates = collectCandidatesForGroup('y', new Set(origs.map((o) => o.id)))

  function onMove(ev: MouseEvent) {
    const dx = (ev.clientX - startX) / pxPerMmLocal
    const dy = (ev.clientY - startY) / pxPerMmLocal
    let newX = Math.max(0, groupX + dx)
    let newY = Math.max(0, groupY + dy)
    const newRight = newX + groupW
    const newBottom = newY + groupH
    const sxLeft = snapValue(newX, vCandidates, SNAP_THRESHOLD_MM)
    const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM)
    const syTop = snapValue(newY, hCandidates, SNAP_THRESHOLD_MM)
    const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM)
    if (sxLeft.lineAt !== null) newX = sxLeft.value
    else if (sxRight.lineAt !== null) newX = sxRight.value - groupW
    if (syTop.lineAt !== null) newY = syTop.value
    else if (syBottom.lineAt !== null) newY = syBottom.value - groupH

    const vLines = [sxLeft.lineAt, sxRight.lineAt].filter((v): v is number => v !== null)
    const hLines = [syTop.lineAt, syBottom.lineAt].filter((v): v is number => v !== null)
    snapLines.vertical = vLines
    snapLines.horizontal = hLines

    const finalDx = newX - groupX
    const finalDy = newY - groupY
    const updates = draggables.map((o) => ({ id: o.id, x: o.x + finalDx, y: o.y + finalDy }))
    emit('moveMany', updates)
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

/** 类似 collectCandidates,但可以排除一组 id(组拖动用) */
function collectCandidatesForGroup(
  axis: 'x' | 'y',
  excludeIds: Set<string>,
): number[] {
  const tpl = props.template
  const list: number[] = axis === 'x'
    ? [0, tpl.paper.width]
    : [0, tpl.paper.height]
  for (const e of tpl.elements) {
    if (excludeIds.has(e.id)) continue
    if (axis === 'x') list.push(e.x, e.x + e.w)
    else list.push(e.y, e.y + e.h)
  }
  return list
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
  // handle 现在是 .canvas-element 的子元素,坐标相对元素盒 0~w / 0~h
  return {
    left: (p.fx * mmToPxScaled(el.w) - offX) + 'px',
    top: (p.fy * mmToPxScaled(el.h) - offY) + 'px',
    cursor: p.cursor,
  }
}


/** 旋转连杆线(元素顶边中点 → 旋转手柄,相对元素盒的 0~w / 0~h 坐标)
 *  handle 现在在 .canvas-element 内,坐标以元素盒左上角为原点。 */
const rotateLineStyle = computed(() => {
  const e = selectedEl.value
  if (!e) return {}
  const cx = mmToPxScaled(e.w) / 2
  return {
    left: (cx - 0.5) + 'px',
    top: '0px',
    width: '1px',
    height: '20px',
  }
})

/** 旋转手柄圆点(handle 现在在 .canvas-element 内,坐标用相对位置;
 *  反向旋转 -el.rotate 让旋转图标始终保持正向)。
 *  元素盒 (x, y, w, h) 中:手柄放在顶边中点上方 30px 处。 */
function rotateHandleStyleReversed(el: Element) {
  return {
    left: (mmToPxScaled(el.w) / 2 - 9) + 'px',
    top: (-30) + 'px',
    transform: `rotate(${-(el.rotate ?? 0)}deg)`,
  }
}

/** 实时旋转角度文本(元素底边中点下方,反向旋转保持正向可读) */
function rotateDegStyle(el: Element) {
  return {
    left: (mmToPxScaled(el.w) / 2) + 'px',
    top: (mmToPxScaled(el.h) + 6) + 'px',
    transform: `translate(-50%, 0) rotate(${-(el.rotate ?? 0)}deg)`,
  }
}

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
  if (el.locked) return // 锁定后不允许 resize
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
  if (el.locked) return // 锁定后不允许旋转
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

// ========== Context Menu ==========

const ctxMenu = reactive<{
  open: boolean
  pos: { x: number; y: number }
  /** 仅记录"是不是在元素上右键打开的菜单";具体 element 用 computedMenuEl 实时查 */
  onElement: boolean
}>({ open: false, pos: { x: 0, y: 0 }, onElement: false })

/** 菜单要展示/操作的元素 = 选中元素。响应式跟随 template + selectedId 变化,
 *  避免右键打开后元素状态变更时菜单的 label (锁定/取消锁定) 失真。 */
const computedMenuEl = computed<Element | null>(() => {
  if (!ctxMenu.open || !ctxMenu.onElement) return null
  const id = props.selectedId
  return id ? props.template.elements.find((x) => x.id === id) ?? null : null
})

/** 右键点击元素时记录鼠标屏幕坐标(用于 paste 定位:把元素粘到鼠标处) */
const lastCtxClient = ref<{ x: number; y: number } | null>(null)

function onContextMenu(e: MouseEvent, id: string) {
  emit('select', id)
  ctxMenu.open = true
  ctxMenu.onElement = true
  ctxMenu.pos = { x: e.clientX, y: e.clientY }
  lastCtxClient.value = { x: e.clientX, y: e.clientY }
}

/** 在 .canvas-wrap 空白处右键时也弹出菜单(onElement=false → computedMenuEl=null) */
function onWrapContextMenu(e: MouseEvent) {
  ctxMenu.open = true
  ctxMenu.onElement = false
  ctxMenu.pos = { x: e.clientX, y: e.clientY }
  lastCtxClient.value = { x: e.clientX, y: e.clientY }
}

function closeCtxMenu() {
  ctxMenu.open = false
  ctxMenu.onElement = false
}

/** 把屏幕 client 坐标转 canvas-mm(给 paste 用) */
function clientToCanvasMm(clientX: number, clientY: number): { x: number; y: number } | null {
  const wrap = document.querySelector('.canvas-wrap') as HTMLElement | null
  const frame = document.querySelector('.canvas-frame') as HTMLElement | null
  if (!wrap || !frame) return null
  const fr = frame.getBoundingClientRect()
  const localX = clientX - fr.left - 24
  const localY = clientY - fr.top - 24
  if (localX < 0 || localY < 0) return null
  const z = zoomValue.value
  return { x: localX / (mmToPx(1) * z), y: localY / (mmToPx(1) * z) }
}

/** 计算置顶/置底/上移/下移按钮是否可用(已在最顶/底则禁) */
const canBringToFront = computed(() => {
  const e = computedMenuEl.value
  if (!e) return false
  return props.template.elements[props.template.elements.length - 1]?.id !== e.id
})
const canSendToBack = computed(() => {
  const e = computedMenuEl.value
  if (!e) return false
  return props.template.elements[0]?.id !== e.id
})
const canMoveUp = canBringToFront
const canMoveDown = canSendToBack

function onCtxRemove() {
  const e = computedMenuEl.value
  if (e) emit('remove', e.id)
  closeCtxMenu()
}
function onCtxCopy() { emit('ctxAction', 'copy', { id: computedMenuEl.value?.id }); closeCtxMenu() }
function onCtxCut() { emit('ctxAction', 'cut', { id: computedMenuEl.value?.id }); closeCtxMenu() }
function onCtxPaste() {
  let x: number | undefined
  let y: number | undefined
  if (lastCtxClient.value) {
    const mm = clientToCanvasMm(lastCtxClient.value.x, lastCtxClient.value.y)
    if (mm) { x = mm.x; y = mm.y }
  }
  emit('ctxAction', 'paste', { x, y })
  closeCtxMenu()
}
function onCtxBringToFront() { emit('ctxAction', 'bringToFront', { id: computedMenuEl.value?.id }); closeCtxMenu() }
function onCtxSendToBack() { emit('ctxAction', 'sendToBack', { id: computedMenuEl.value?.id }); closeCtxMenu() }
function onCtxMoveUp() { emit('ctxAction', 'moveUp', { id: computedMenuEl.value?.id }); closeCtxMenu() }
function onCtxMoveDown() { emit('ctxAction', 'moveDown', { id: computedMenuEl.value?.id }); closeCtxMenu() }
function onCtxToggleLock() { emit('ctxAction', 'toggleLock', { id: computedMenuEl.value?.id }); closeCtxMenu() }
function onCtxUndo() { emit('ctxAction', 'undo'); closeCtxMenu() }
function onCtxRedo() { emit('ctxAction', 'redo'); closeCtxMenu() }

// ========== 点画布空白处取消选中 ==========
// 用 document mousedown 监听(比 @click.self 更可靠:跨浏览器 + 不被
// 元素内 mousedown 提前 stopPropagation 干扰),点中任意 .canvas-element
// 时不取消,其它都取消。canvas-frame / ruler / snap-line 也算"内部"。

function onDocMouseDown(e: MouseEvent) {
  if (marqueeStarting.value) return
  const target = e.target as HTMLElement | null
  if (!target) return
  // 命中 .canvas-element → 保留选中(元素的 mousedown 会自己处理 select)
  if (target.closest('.canvas-element')) return
  // 命中右键菜单 → 保留选中(菜单的 action handler 自己处理;否则点菜单
  // 时 mousedown 会先于 click 触发,把 selected 置 null,导致 toggleLock
  // 读到 e?.locked === undefined,反复 setLocked(id, true))
  if (target.closest('.ctx-menu')) return
  // 命中框选矩形 → 不动(矩形自身 pointer-events: none,但兜底)
  if (target.closest('.marquee-rect')) return
  // 命中画布外部(如 TopBar / FormatToolbar / PropertyPanel)→ 不动
  if (!target.closest('.canvas-wrap')) return
  // 命中画布空白(canvas / ruler / frame 等都算空白)→ 取消选中
  if (props.selectedId || (props.multiSelectedIds && props.multiSelectedIds.length > 0)) {
    emit('selectMany', [])
  }
}

onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))

/** template 变化时实时同步 multi 集合(template 引用本身不变,但 elements 数组会换) */
watch(() => props.template.elements, () => {
  const ids = new Set(props.template.elements.map((e) => e.id))
  if (props.multiSelectedIds) {
    const valid = props.multiSelectedIds.filter((id) => ids.has(id))
    if (valid.length !== props.multiSelectedIds.length) {
      emit('selectMany', valid)
    }
  }
})
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
  z-index: 5; /* 在 snap-line 之上,让辅助线延伸到 ruler 位置时 ruler 仍然可见 */
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
/* 锁定元素:边色变金黄 + 不允许拖动光标 */
.canvas-element.locked {
  border-color: #faad14 !important;
  cursor: not-allowed !important;
}
/* 锁定徽标(元素左上角) */
.lock-badge {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 20px;
  height: 20px;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  background: #faad14;
  color: #fff;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 100;
}
/* 实时旋转角度文本(元素底边中点下方,反向旋转保持正向可读) */
.rotate-deg {
  position: absolute;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: #1890ff;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 101;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
/* 吸附辅助线:放在 .canvas-frame 内,top:0 / bottom:0 跨越 ruler 区域(被 ruler 盖住) */
.snap-line {
  position: absolute;
  background: #ff4d4f;
  pointer-events: none;
  z-index: 3;
  /* 拖动时显示/隐藏,平滑过渡 */
  transition: opacity 100ms;
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
/* 多选组的 4 边对齐线:浅蓝虚线,跟吸附红实线区分 */
.snap-line.multi-group {
  background: transparent;
  border-color: #69c0ff;
}
.snap-v.multi-group {
  border-left: 1px dashed #69c0ff;
}
.snap-h.multi-group {
  border-top: 1px dashed #69c0ff;
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

/* ========== 框选 / 多选 ========== */
.marquee-rect {
  position: absolute;
  pointer-events: none;
  z-index: 9998;
  background: rgba(24, 144, 255, 0.08);
  border: 1.5px dashed #1890ff;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.15);
  box-sizing: border-box;
}
.marquee-size {
  position: absolute;
  right: -2px;
  bottom: -28px;
  padding: 2px 8px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 500;
  color: #fff;
  background: #1890ff;
  border-radius: 3px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  user-select: none;
}
/* 多选但非主选:蓝虚线包围(跟单选实线区分) */
.canvas-element.multi-selected {
  border: 1.5px dashed #1890ff !important;
  background: rgba(24, 144, 255, 0.06) !important;
}
/* 框选过程中实时高亮将要选中的元素 */
.canvas-element.marquee-hit {
  border: 1.5px dashed #69c0ff !important;
  background: rgba(24, 144, 255, 0.14) !important;
  transition: background 60ms, border-color 60ms;
}
</style>
