<!--
  LineElement — 直线(thickness / color)。
-->
<template>
  <div class="el-line" :style="style"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LineElement } from '../../core/types'

const props = defineProps<{
  element: LineElement
}>()

const style = computed(() => ({
  borderTop: `${props.element.thickness}px solid ${props.element.color ?? '#000'}`,
}))
</script>

<style scoped>
.el-line {
  width: 100%;
}
</style>