<!--
  ImageElement — 图片元素渲染(src / fit / 边框)。
-->
<template>
  <div class="el-image" :style="boxStyle">
    <img v-if="element.src" :src="element.src" :style="imgStyle" />
    <div v-else class="placeholder">图片</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ImageElement } from '../../core/types'
import { boxStyle as applyBoxStyle } from '../../core/elementStyle'

const props = defineProps<{
  element: ImageElement
}>()

const boxStyle = computed(() => applyBoxStyle(props.element))
const imgStyle = computed(() => ({ objectFit: props.element.fit ?? 'contain' }))
</script>

<style scoped>
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
.placeholder {
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  width: 100%;
}
</style>