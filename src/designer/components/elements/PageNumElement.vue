<!--
  PageNumElement — 页码(format 字符串,支持 {page} / {total} 占位)。
-->
<template>
  <div class="el-pagenum" :style="style">{{ text }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageNumElement } from '../../core/types'
import { mmToPx } from '../../core/render'

const props = defineProps<{
  element: PageNumElement
}>()

const text = computed(() => props.element.format.replace('{page}', '1').replace('{total}', '1'))

const style = computed(() => {
  const e = props.element
  const justify = e.align === 'center' ? 'center' : e.align === 'right' ? 'flex-end' : 'flex-start'
  return {
    fontSize: mmToPx(e.fontSize) + 'px',
    fontWeight: e.fontWeight,
    color: e.color ?? '#000',
    fontFamily: e.fontFamily,
    display: 'flex',
    alignItems: 'center',
    justifyContent: justify,
  }
})
</script>