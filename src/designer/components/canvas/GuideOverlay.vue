<template>
  <!-- 用户自定义参考线(guides):跨整个 wrap,从 ruler 区域穿过。
       mm → px 由父级通过函数 prop 提供,本组件只渲染。 -->
  <div
    v-for="g in guides"
    v-show="false"
    :key="`g-hidden-${g.id}`"
  />
  <template v-for="g in guides" :key="g.id">
    <div
      v-if="g.axis === 'horizontal'"
      class="guide-line guide-h"
      :class="{ highlighted: highlightedId === g.id }"
      :style="{ top: getY(g.position) }"
      @mouseenter="emit('hover', g.id)"
      @mouseleave="emit('hover', null)"
      @dblclick.stop="emit('remove', g.id)"
    />
    <div
      v-else
      class="guide-line guide-v"
      :class="{ highlighted: highlightedId === g.id }"
      :style="{ left: getX(g.position) }"
      @mouseenter="emit('hover', g.id)"
      @mouseleave="emit('hover', null)"
      @dblclick.stop="emit('remove', g.id)"
    />
  </template>
</template>

<script setup lang="ts">
export type Guide = {
  id: string;
  axis: "horizontal" | "vertical";
  position: number;
  color?: string;
};

defineProps<{
  guides: Guide[];
  highlightedId: string | null;
  /** mm → wrap 内 px(水平线 y 坐标) */
  getY: (positionMm: number) => string;
  /** mm → wrap 内 px(垂直线 x 坐标) */
  getX: (positionMm: number) => string;
}>();

const emit = defineEmits<{
  hover: [id: string | null];
  remove: [id: string];
}>();
</script>

<style scoped>
.guide-line {
  position: absolute;
  pointer-events: auto;
  z-index: 6;
  cursor: pointer;
}
.guide-h {
  left: 0;
  right: 0;
  height: 1px;
  background: #1677ff;
  transform: translateY(-0.5px);
}
.guide-v {
  top: 0;
  bottom: 0;
  width: 1px;
  background: #1677ff;
  transform: translateX(-0.5px);
}
.guide-line.highlighted {
  background: #4096ff;
  box-shadow: 0 0 0 1px rgba(64, 150, 255, 0.3);
}
</style>
