<!--
  TextElement — 文本元素渲染(字体 / 对齐 / 列表 / 边框 / 背景)。
  仿 Vue-Print-Designer elements/TextElement.vue 的拆分:本组件只负责单元素渲染。
-->
<template>
  <div class="el-text" :style="style">
    <template v-if="!element.listType || element.listType === 'none'">{{ element.text }}</template>
    <ul v-else-if="element.listType === 'ul'" style="margin: 0; padding-left: 1.2em">
      <li v-for="(line, i) in textLines" :key="i">{{ line }}</li>
    </ul>
    <ol v-else style="margin: 0; padding-left: 1.2em">
      <li v-for="(line, i) in textLines" :key="i">{{ line }}</li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TextElement } from '../../core/types'
import { boxStyle as applyBoxStyle } from '../../core/elementStyle'
import { mmToPx } from '../../core/render'

const props = defineProps<{
  element: TextElement
}>()

const textLines = computed<string[]>(() => props.element.text.split('\n'))

const style = computed(() => {
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
    fontSize: mmToPx(e.fontSize) + 'px',
    fontFamily: e.fontFamily,
    fontWeight: e.fontWeight,
    fontStyle: e.fontStyle && e.fontStyle !== 'normal' ? e.fontStyle : undefined,
    color: e.color ?? '#000',
    lineHeight: e.lineHeight,
    letterSpacing: e.letterSpacing != null ? e.letterSpacing + 'px' : undefined,
    textDecoration: e.textDecoration ?? 'none',
    backgroundColor: e.backgroundColor,
    zIndex: e.zIndex,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: justifyV,
    alignItems: alignH,
    ...(e.writingMode && e.writingMode !== 'horizontal-tb'
      ? { writingMode: e.writingMode, textOrientation: 'mixed' }
      : {}),
    ...wrapStyle[tw],
    ...applyBoxStyle(e),
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
</style>