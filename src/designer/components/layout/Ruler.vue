<script setup lang="ts">
/**
 * Ruler — Canvas 2D 绘制标尺:
 *  - 步长自适应(zoom 大→步长小,zoom 小→步长大)
 *  - 每主刻度 5 子分划
 *  - 跨整个 viewport(由父级用 scroll + offset 控制"假装滚动")
 *  - 步长 / 文字按 unit 换算(mm / px / pt / in / cm)
 *  - dark mode 切色
 *  - ResizeObserver 自动重绘
 *  - mousedown 发射 guide-drag-start(供父级创建参考线)
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Unit } from '../../core/units'
import { mmToUnit, UNIT_TO_PX } from '../../core/units'

const props = defineProps<{
  type: 'horizontal' | 'vertical'
  /** 缩放 */
  zoom: number
  /** 滚动容器的 scrollLeft/scrollTop */
  scroll: number
  /** 画布 0mm 位置在屏幕上的偏移(相对 ruler 左/上边缘) */
  offset: number
  /** ruler 厚度 px */
  thick?: number
  /** 选中元素 4 边在 ruler 上的位置标记(单位:mm) */
  indicators?: { position: number; color: string }[]
  /** 选中元素围成的范围,在 ruler 上画浅色填充(单位:mm) */
  range?: { start: number; end: number; color: string } | null
  /** 选中 / 拖动时元素的 mm 数字 chip(横向 ruler 显示 2 个 mm,纵向 ruler 同)
   *  side 决定画在 ruler 哪一侧: horizontal ruler → 'h'(贴下沿);
   *                              vertical ruler → 'v'(贴右沿) */
  positionLabels?: { mm: number; text: string; color: string }[]
  /** 显示单位(默认 mm) */
  unit?: Unit
  /** dark mode 配色 */
  darkMode?: boolean
}>()

const emit = defineEmits<{
  /** 用户从 ruler 区域按下鼠标,父级据此进入"创建 / 拖动 guide"流程 */
  guideDragStart: [e: MouseEvent]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const THICKNESS = props.thick ?? 32

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  const {
    zoom,
    scroll,
    offset,
    type,
    indicators,
    range,
    positionLabels,
    unit = 'mm',
    darkMode = false,
  } = props
  const axisLength = type === 'horizontal' ? width : height

  // 配色(深浅主题)
  const bgFill = darkMode ? '#1f2937' : '#F9FAFB'
  const tickStroke = darkMode ? '#9ca3af' : '#9CA3AF'
  const tickLabel = darkMode ? '#d1d5db' : '#6B7280'
  const indicatorFallback = darkMode ? '#60a5fa' : '#1677ff'

  // 清屏 + 背景
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = bgFill
  ctx.fillRect(0, 0, width, height)

  // 当前单位下 1mm 等多少 px(用于把 mm 位置转屏幕位置)
  // 公式:屏幕 x = offset + valMm * (pxPerMm * zoom) - scroll
  // 改用 unit:valMm 转 unitValue = mmToUnit(valMm, unit),再 px = unitValue * UNIT_TO_PX[unit] * zoom
  const unitPx = UNIT_TO_PX[unit] * zoom

  // range 填充(选中元素范围,半透明)
  if (range) {
    const startPos = offset + mmToUnit(range.start, unit) * unitPx - scroll
    const endPos = offset + mmToUnit(range.end, unit) * unitPx - scroll
    const minPos = Math.ceil(Math.min(startPos, endPos))
    const maxPos = Math.floor(Math.max(startPos, endPos))
    const clampedMinPos = Math.max(0, Math.min(minPos, axisLength))
    const clampedMaxPos = Math.max(0, Math.min(maxPos, axisLength))
    const rangeSize = Math.max(0, clampedMaxPos - clampedMinPos)
    ctx.fillStyle = range.color
    if (type === 'horizontal') {
      ctx.fillRect(clampedMinPos, 0, rangeSize, THICKNESS)
    } else {
      ctx.fillRect(0, clampedMinPos, THICKNESS, rangeSize)
    }
  }

  // indicators(选中元素 4 边位置,1px 短线)
  if (indicators && indicators.length > 0) {
    for (const indicator of indicators) {
      const rawPos = Math.round(offset + mmToUnit(indicator.position, unit) * unitPx - scroll)
      const pos = Math.max(0, Math.min(rawPos, axisLength - 1))
      ctx.fillStyle = indicator.color || indicatorFallback
      if (type === 'horizontal') {
        ctx.fillRect(pos, 0, 1, THICKNESS)
      } else {
        ctx.fillRect(0, pos, THICKNESS, 1)
      }
    }
  }

  // positionLabels 改为 DOM chip(见 template):因 ruler canvas 高度固定 32px,
  // chip 若用 canvas 绘制只能塞在 ruler 内,视觉上 chip 中心会跟 indicator 短线重合;
  // 现改为 template 浮层,可伸出 ruler 之外(old .self-v-label / .self-h-label 语义)

  // 刻度
  ctx.strokeStyle = tickStroke
  ctx.fillStyle = tickLabel
  ctx.lineWidth = 1
  ctx.font = '10px sans-serif'
  ctx.beginPath()

  // 目标视觉间距 50px → 折算到当前 unit 下的间距
  const targetVisualGap = 50
  const targetUnitGap = targetVisualGap / unitPx

  // 步长自适应(候选值是 unit 维度的)
  const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
  let stepUnit = steps[steps.length - 1]!
  for (const s of steps) {
    if (s >= targetUnitGap - 0.001) {
      stepUnit = s
      break
    }
  }

  // 屏幕 0 位置对应的逻辑 unit:屏幕像素位置 = offset + valUnit * unitPx - scroll
  // 反推:屏幕 x=0 → valUnit = (-offset + scroll) / unitPx
  const startUnitRaw = (-offset + scroll) / unitPx
  const endUnitRaw = (axisLength - offset + scroll) / unitPx

  const firstMarkUnit = Math.floor(startUnitRaw / stepUnit) * stepUnit

  for (let valUnit = firstMarkUnit; valUnit <= endUnitRaw; valUnit += stepUnit) {
    const pos = offset + valUnit * unitPx - scroll
    const label = formatUnitLabel(valUnit, unit)

    if (type === 'horizontal') {
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, THICKNESS)
      ctx.fillText(label, pos + 2, 10)
    } else {
      ctx.moveTo(0, pos)
      ctx.lineTo(THICKNESS, pos)
      ctx.save()
      ctx.translate(10, pos + 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(label, 4, 0)
      ctx.restore()
    }

    // 5 个子分划
    const subStepUnit = stepUnit / 5
    for (let i = 1; i < 5; i++) {
      const subValUnit = valUnit + subStepUnit * i
      const subPos = offset + subValUnit * unitPx - scroll
      if (type === 'horizontal') {
        ctx.moveTo(subPos, THICKNESS - 5)
        ctx.lineTo(subPos, THICKNESS)
      } else {
        ctx.moveTo(THICKNESS - 5, subPos)
        ctx.lineTo(THICKNESS, subPos)
      }
    }
  }

  ctx.stroke()
}

/** 数字 → 字符串标签(按 unit 控制精度) */
function formatUnitLabel(value: number, unit: Unit): string {
  if (unit === 'px') return Math.round(value).toString()
  return Number(value.toFixed(1)).toString()
}

/** mm → ruler 内 px(给 chip 用,跟 indicator 短线同一坐标系) */
function mmToRulerPx(mm: number): number {
  return Math.round(props.offset + mmToUnit(mm, props.unit ?? 'mm') * (UNIT_TO_PX[props.unit ?? 'mm'] * props.zoom) - props.scroll)
}

/** chip 样式:横向 ruler 紧贴 ruler 下沿(ruler 底下方),x 跟随 mm;纵向 ruler 紧贴右侧,y 跟随 mm */
function chipStyle(label: { mm: number; color?: string }) {
  const pos = mmToRulerPx(label.mm)
  return {
    background: label.color || '#69c0ff',
    ...(props.type === 'horizontal'
      ? { left: pos + 'px', top: '32px' }
      : { top: pos + 'px', left: '32px' }),
  }
}

/** 圆角矩形路径(独立成 path,fill 由调用方控制) */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const canvas = canvasRef.value
    if (canvas) {
      const { width, height } = entry.contentRect
      canvas.width = width
      canvas.height = height
      draw()
    }
  }
})

onMounted(() => {
  if (canvasRef.value) {
    resizeObserver.observe(canvasRef.value.parentElement!)
    draw()
    // ruler 区域捕获 mousedown → 让父级据此进入 guide 拖动
    canvasRef.value.parentElement?.addEventListener('mousedown', onMouseDown)
  }
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
})

function onMouseDown(e: MouseEvent) {
  // 只在 ruler 主体区域触发(ruler 内部 padding 边缘不响应)
  emit('guideDragStart', e)
}

watch(
  () => [props.zoom, props.scroll, props.offset, props.indicators, props.range, props.positionLabels, props.unit, props.darkMode],
  () => draw(),
  { deep: true },
)
</script>

<template>
  <div class="designer-ruler" :class="type">
    <canvas ref="canvasRef" class="block" />
    <!-- chip:横向 ruler 紧贴 ruler 下沿(ruler 底下方),x 跟随 pxPos(在 ruler 内 px);
         纵向 ruler 紧贴 ruler 右沿(ruler 右侧外),y 跟随 pxPos。跟旧 .self-line-label 一致,
         chip 不在 ruler 内而在 ruler 紧邻外缘(横向 ruler 下方 / 纵向 ruler 右侧) -->
    <span
      v-for="(label, idx) in positionLabels ?? []"
      :key="`pos-label-${idx}`"
      class="pos-label"
      :class="type === 'horizontal' ? 'pos-label-h' : 'pos-label-v'"
      :style="chipStyle(label)"
      >{{ label.text }}</span
    >
  </div>
</template>

<style scoped>
.designer-ruler {
  position: relative;
  background: #f9fafb;
  /* overflow 改为 visible:chip 浮层在 ruler 紧邻外缘(ruler-h 下方 / ruler-v 右侧),
   * 不能被 ruler 内部 overflow:hidden 裁剪 */
  overflow: visible;
  user-select: none;
  pointer-events: auto; /* 接收 guide-drag-start */
}
.designer-ruler.horizontal {
  width: 100%;
  height: 32px;
  border-bottom: 1px solid #d8d8de;
}
.designer-ruler.vertical {
  width: 32px;
  height: 100%;
  border-right: 1px solid #d8d8de;
}
.designer-ruler canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 事件交给父 div 统一处理 */
}
/* chip:固定在 ruler 紧邻外缘(横向 ruler 下方 / 纵向 ruler 右侧),
 * x 或 y 跟随 mm 位置。跟旧 .self-line-label 一致,不受 wrap scroll 影响 */
.pos-label {
  position: absolute;
  display: inline-block;
  pointer-events: none;
  transform: translate(-50%, 0); /* horizontal:chip 中心对齐 pos */
  min-width: 22px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 14px;
  border-radius: 2px;
  white-space: nowrap;
  text-align: center;
  user-select: none;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  z-index: 1;
}
.pos-label-v {
  transform: translate(0, -50%); /* vertical:chip 中心对齐 pos(只 y 居中,x 由 left 固定) */
}
</style>
