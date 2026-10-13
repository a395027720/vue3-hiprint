<template>
  <!-- text -->
  <div
    v-if="element.type === 'text'"
    class="el-text"
    :style="textStyle"
  >{{ element.text }}</div>

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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Element, TableElement } from '../core/types'

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
    transform: e.rotate ? `rotate(${e.rotate}deg)` : undefined,
    transformOrigin: e.rotate ? 'center' : undefined,
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
