<!--
  TableElement — 表格元素渲染(列 / thead / 行预览)。
-->
<template>
  <div class="el-table">
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableElement } from '../../core/types'

const props = defineProps<{
  element: TableElement
  /** 表格预览用的示例数据(默认 3 行占位) */
  previewData?: Record<string, unknown>[]
}>()

function cellStyle(align?: string) {
  return {
    textAlign: (align ?? 'left') as 'left' | 'center' | 'right',
    fontSize: (props.element.fontSize ?? 12) + 'pt',
  }
}

const previewRows = computed<Record<string, unknown>[]>(() => {
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
.placeholder {
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  width: 100%;
}
</style>