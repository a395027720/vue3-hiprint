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
    // 0 度主刻度:加粗 + 红线,跟画布 0mm 线对应
    const isOrigin = Math.abs(valUnit) < 1e-9

    if (isOrigin) {
      ctx.save()
      ctx.strokeStyle = darkMode ? '#f87171' : '#dc2626'
      ctx.fillStyle = darkMode ? '#f87171' : '#dc2626'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      if (type === 'horizontal') {
        ctx.moveTo(pos, 0)
        ctx.lineTo(pos, THICKNESS)
        ctx.fillText('0', pos + 3, 11)
      } else {
        ctx.moveTo(0, pos)
        ctx.lineTo(THICKNESS, pos)
        ctx.save()
        ctx.translate(11, pos + 3)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText('0', 0, 0)
        ctx.restore()
      }
      ctx.stroke()
      ctx.restore()
      continue
    }

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
  () => [props.zoom, props.scroll, props.offset, props.indicators, props.range, props.unit, props.darkMode],
  () => draw(),
  { deep: true },
)
</script>

<template>
  <div class="designer-ruler" :class="type">
    <canvas ref="canvasRef" class="block" />
  </div>
</template>

<style scoped>
.designer-ruler {
  position: relative;
  background: #f9fafb;
  overflow: hidden;
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
</style>
