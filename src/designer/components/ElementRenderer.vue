<template>
  <!-- text -->
  <div
    v-if="element.type === 'text'"
    class="el-text"
    :style="textStyle"
  >
    <template v-if="!element.listType || element.listType === 'none'">{{ element.text }}</template>
    <ul v-else-if="element.listType === 'ul'" style="margin: 0; padding-left: 1.2em">
      <li v-for="(line, i) in textLines" :key="i">{{ line }}</li>
    </ul>
    <ol v-else style="margin: 0; padding-left: 1.2em">
      <li v-for="(line, i) in textLines" :key="i">{{ line }}</li>
    </ol>
  </div>

  <!-- image -->
  <div v-else-if="element.type === 'image'" class="el-image" :style="imageBoxStyle">
    <img v-if="element.src" :src="element.src" :style="imageStyle" alt="" />
    <div v-else class="placeholder">图片</div>
  </div>

  <!-- table -->
  <div v-else-if="element.type === 'table'" class="el-table">
    <table>
      <thead>
        <tr>
          <th
            v-for="c in element.columns"
            :key="c.field"
            :style="cellStyle(c.align)"
          >{{ c.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in previewRows" :key="i">
          <td
            v-for="c in element.columns"
            :key="c.field"
            :style="cellStyle(c.align)"
          >{{ row[c.field] ?? '' }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="element.columns.length === 0" class="placeholder">配置表格列</div>
  </div>

  <!-- line -->
  <div
    v-else-if="element.type === 'line'"
    class="el-line"
    :style="lineStyle"
  ></div>

  <!-- pagenum -->
  <div
    v-else-if="element.type === 'pagenum'"
    class="el-pagenum"
    :style="pageNumStyle"
  >{{ pageNumText }}</div>

  <!-- barcode(MVP:横线示意) -->
  <div
    v-else-if="element.type === 'barcode'"
    class="el-barcode"
    :style="barcodeBoxStyle"
  >
    <svg :viewBox="`0 0 ${element.w} ${element.h}`" :width="mmToPx(element.w)" :height="mmToPx(element.h * 0.75)">
      <rect
        v-for="(bar, i) in barcodeBars"
        :key="i"
        :x="bar.x"
        y="0"
        :width="bar.w"
        :height="mmToPx(element.h * 0.75)"
        fill="#000"
      />
    </svg>
    <div style="font-size: 10px; color: #333; margin-top: 2px">{{ element.value }}</div>
  </div>

  <!-- qrcode(MVP:伪棋盘) -->
  <div
    v-else-if="element.type === 'qrcode'"
    class="el-qrcode"
    :style="qrcodeBoxStyle"
  >
    <svg :viewBox="`0 0 ${qrSize} ${qrSize}`" :width="qrSize" :height="qrSize">
      <rect
        v-for="(cell, i) in qrCells"
        :key="i"
        :x="cell.x"
        :y="cell.y"
        :width="cell.size"
        :height="cell.size"
        fill="#000"
      />
    </svg>
  </div>

  <!-- multilabel -->
  <div
    v-else-if="element.type === 'multilabel'"
    class="el-multilabel"
    :style="multiLabelBoxStyle"
  >
    <div
      v-for="(l, i) in element.labels.slice(0, element.cols * 2)"
      :key="i"
      class="label-chip"
      :style="labelChipStyle(i, l)"
    >{{ l.text }}</div>
  </div>

  <!-- rect -->
  <div
    v-else-if="element.type === 'rect'"
    class="el-rect"
    :style="rectStyle"
  ></div>

  <!-- circle -->
  <div
    v-else-if="element.type === 'circle'"
    class="el-circle"
    :style="circleStyle"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Element, TableElement } from '../core/types'
import { mmToPx } from '../core/render'

const props = defineProps<{
  element: Element
  /** table 预览用的示例数据(MVP:固定 3 行) */
  previewData?: Record<string, unknown>[]
}>()

function sideCss(
  e: { borderTop?: string; borderRight?: string; borderBottom?: string; borderLeft?: string; borderSize?: number; borderColor?: string },
  side: 'top' | 'right' | 'bottom' | 'left',
): string | undefined {
  const key = `border${side[0].toUpperCase()}${side.slice(1)}` as keyof typeof e
  const v = e[key] as string | undefined
  if (!v) return undefined
  return `${e.borderSize ?? 0.25}mm ${v} ${e.borderColor ?? '#000'}`
}

function paddingSide(
  e: { paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number },
  side: 'top' | 'right' | 'bottom' | 'left',
): string | undefined {
  const key = `padding${side[0].toUpperCase()}${side.slice(1)}` as keyof typeof e
  const v = e[key] as number | undefined
  return v ? `${v}mm` : undefined
}

const textStyle = computed(() => {
  if (props.element.type !== 'text') return {}
  const e = props.element
  const tw = e.textWrap ?? 'normal'
  const wrapStyle: Record<typeof tw, Record<string, string>> = {
    normal: {},
    nowrap: { whiteSpace: 'nowrap', overflow: 'hidden' },
    'break-word': { wordBreak: 'break-all', overflowWrap: 'break-word' },
    ellipsis: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  }
  const va = e.verticalAlign ?? 'top'
  const justifyV = va === 'middle' ? 'center' : va === 'bottom' ? 'flex-end' : 'flex-start'
  const alignH = e.align === 'center' ? 'center' : e.align === 'right' ? 'flex-end' : 'flex-start'
  return {
    fontSize: e.fontSize + 'pt',
    fontFamily: e.fontFamily,
    fontWeight: e.fontWeight,
    fontStyle: e.fontStyle && e.fontStyle !== 'normal' ? e.fontStyle : undefined,
    color: e.color ?? '#000',
    lineHeight: e.lineHeight,
    letterSpacing: e.letterSpacing != null ? e.letterSpacing + 'px' : undefined,
    textDecoration: e.textDecoration ?? 'none',
    backgroundColor: e.backgroundColor,
    borderTop: sideCss(e, 'top'),
    borderRight: sideCss(e, 'right'),
    borderBottom: sideCss(e, 'bottom'),
    borderLeft: sideCss(e, 'left'),
    borderRadius: e.borderRadius ? e.borderRadius + 'mm' : undefined,
    paddingTop: paddingSide(e, 'top'),
    paddingRight: paddingSide(e, 'right'),
    paddingBottom: paddingSide(e, 'bottom'),
    paddingLeft: paddingSide(e, 'left'),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: justifyV,
    alignItems: alignH,
    ...wrapStyle[tw],
    zIndex: e.zIndex,
    boxSizing: 'border-box',
  }
})

const imageBoxStyle = computed(() => {
  if (props.element.type !== 'image') return {}
  const e = props.element
  return {
    borderTop: sideCss(e, 'top'),
    borderRight: sideCss(e, 'right'),
    borderBottom: sideCss(e, 'bottom'),
    borderLeft: sideCss(e, 'left'),
    borderRadius: e.borderRadius ? e.borderRadius + 'mm' : undefined,
    paddingTop: paddingSide(e, 'top'),
    paddingRight: paddingSide(e, 'right'),
    paddingBottom: paddingSide(e, 'bottom'),
    paddingLeft: paddingSide(e, 'left'),
    boxSizing: 'border-box',
  }
})

const imageStyle = computed(() => {
  if (props.element.type !== 'image') return {}
  return { objectFit: props.element.fit ?? 'contain' }
})

const lineStyle = computed(() => {
  if (props.element.type !== 'line') return {}
  return { borderTop: `${props.element.thickness}px solid ${props.element.color ?? '#000'}` }
})

function cellStyle(align?: string) {
  const fs = (props.element as TableElement).fontSize ?? 12
  return {
    textAlign: (align ?? 'left') as 'left' | 'center' | 'right',
    fontSize: fs + 'pt',
  }
}

const previewRows = computed<Record<string, unknown>[]>(() => {
  if (props.element.type !== 'table') return []
  return (
    props.previewData ?? [
      { name: '示例 A', qty: 1, price: 100 },
      { name: '示例 B', qty: 2, price: 200 },
      { name: '示例 C', qty: 3, price: 300 },
    ]
  )
})

const textLines = computed<string[]>(() => {
  if (props.element.type !== 'text') return []
  return props.element.text.split('\n')
})

const pageNumText = computed<string>(() => {
  if (props.element.type !== 'pagenum') return ''
  return props.element.format.replace('{page}', '1').replace('{total}', '1')
})

const pageNumStyle = computed(() => {
  if (props.element.type !== 'pagenum') return {}
  const e = props.element
  const justify = e.align === 'center' ? 'center' : e.align === 'right' ? 'flex-end' : 'flex-start'
  return {
    fontSize: e.fontSize + 'pt',
    fontWeight: e.fontWeight,
    color: e.color ?? '#000',
    fontFamily: e.fontFamily,
    display: 'flex',
    alignItems: 'center',
    justifyContent: justify,
  }
})

const barcodeBoxStyle = computed(() => {
  if (props.element.type !== 'barcode') return {}
  return {
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }
})

const barcodeBars = computed<Array<{ x: number; w: number }>>(() => {
  if (props.element.type !== 'barcode') return []
  const w = mmToPx(props.element.w)
  const count = Math.max(20, Math.floor(w / 3))
  const bars: Array<{ x: number; w: number }> = []
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) continue
    bars.push({ x: (i / count) * w, w: ((i * 7) % 4) + 1 })
  }
  return bars
})

const qrSize = computed(() => {
  if (props.element.type !== 'qrcode') return 0
  return mmToPx(Math.min(props.element.w, props.element.h))
})

const qrcodeBoxStyle = computed(() => ({
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const qrCells = computed<Array<{ x: number; y: number; size: number }>>(() => {
  if (props.element.type !== 'qrcode' || qrSize.value === 0) return []
  const n = 21
  const cell = qrSize.value / n
  const out: Array<{ x: number; y: number; size: number }> = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if ((x * 7 + y * 13 + x * y) % 3 === 0) {
        out.push({ x: x * cell, y: y * cell, size: cell })
      }
    }
  }
  return out
})

const multiLabelBoxStyle = computed(() => {
  if (props.element.type !== 'multilabel') return {}
  const gap = 2
  const cellW = (mmToPx(props.element.w) - gap * (props.element.cols - 1)) / props.element.cols
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${props.element.cols}, ${cellW}px)`,
    gap: `${gap}px`,
  }
})

function labelChipStyle(i: number, l: { color?: string }) {
  if (props.element.type !== 'multilabel') return {}
  return {
    background: l.color ?? '#f0f7ff',
    border: '1px solid #91caff',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: (props.element.fontSize ?? 12) + 'pt',
    color: props.element.color ?? '#333',
    height: '18px',
  }
}

const rectStyle = computed(() => {
  if (props.element.type !== 'rect') return {}
  const e = props.element
  return {
    background: e.fill ?? 'transparent',
    boxSizing: 'border-box',
    borderTop: sideCss(e, 'top'),
    borderRight: sideCss(e, 'right'),
    borderBottom: sideCss(e, 'bottom'),
    borderLeft: sideCss(e, 'left'),
    borderRadius: e.borderRadius ? e.borderRadius + 'mm' : undefined,
  }
})

const circleStyle = computed(() => {
  if (props.element.type !== 'circle') return {}
  const e = props.element
  return {
    background: e.fill ?? 'transparent',
    borderRadius: '50%',
    boxSizing: 'border-box',
    borderTop: sideCss(e, 'top'),
    borderRight: sideCss(e, 'right'),
    borderBottom: sideCss(e, 'bottom'),
    borderLeft: sideCss(e, 'left'),
  }
})
</script>

<style scoped>
.el-text {
  width: 100%;
  height: 100%;
  line-height: 1.2;
  white-space: pre-wrap;
  overflow: hidden;
}
.el-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.el-image img {
  width: 100%;
  height: 100%;
  display: block;
}
.el-table {
  width: 100%;
  overflow: auto;
}
.el-table table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.el-table th,
.el-table td {
  border: 1px solid #d0d0d0;
  padding: 2px 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-table th {
  background: #f5f5f5;
  font-weight: bold;
}
.el-line { width: 100%; }
.placeholder {
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  width: 100%;
}
</style>
