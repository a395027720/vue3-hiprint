<template>
  <!-- 拖动中"延长线 + 选区填充 + snap 命中红线"的浮层。
       mm 数字 chip 已在 Ruler.vue 内 canvas 渲染(positionLabels),本组件不再画 label。 -->
  <template v-if="selfLines">
    <div class="self-fill" :style="selfFillStyle" />
    <div
      v-for="x in selfLines.v"
      :key="`self-v-${x.id}`"
      class="self-line self-v"
      :style="{
        left: x.px + 'px',
        top: -wrapScrollTop + 'px',
        bottom: -wrapScrollTop + 'px',
      }"
    />
    <div
      v-for="y in selfLines.h"
      :key="`self-h-${y.id}`"
      class="self-line self-h"
      :style="{
        top: y.px + 'px',
        left: -wrapScrollLeft + 'px',
        right: -wrapScrollLeft + 'px',
      }"
    />
  </template>

  <!-- 吸附命中红线:跨整个 .canvas-wrap -->
  <div
    v-for="x in snapLines.vertical"
    :key="`v-${x.id}`"
    class="snap-line snap-v"
    :style="{ left: x.px + 'px' }"
  />
  <div
    v-for="y in snapLines.horizontal"
    :key="`h-${y.id}`"
    class="snap-line snap-h"
    :style="{ top: y.px + 'px' }"
  />
</template>

<script setup lang="ts">
/** 父级把 mm 坐标已算成 px 后的线段项。
 *  mm 字段保留给 label 显示;px 给 left/top 定位;id 给 v-for key。 */
export type OverlayLine = { id: number; mm: number; px: number };

defineProps<{
  selfLines: { v: OverlayLine[]; h: OverlayLine[] } | null;
  snapLines: { vertical: OverlayLine[]; horizontal: OverlayLine[] };
  /** 选区填充矩形(从 selfLines 4 边围成) */
  selfFillStyle: Record<string, string>;
  /** wrap 滚动距离:self-v / self-h 用它修正 top/bottom/left/right,
   *  让延长线在 wrap 可视区内跨满 */
  wrapScrollTop: number;
  wrapScrollLeft: number;
}>();
</script>

<style scoped>
/* 拖动中延长线围成的范围浅蓝半透明填充(ruler 区域的浅蓝填充由 Ruler.range fillRect 渲染,
 * 见 Ruler.vue:82-96;.self-fill 仅负责画布内矩形,z-index 不需盖 ruler) */
.self-fill {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  background: rgba(24, 144, 255, 0.08);
  transition: opacity 80ms;
}

/* 拖动中的延长线:浅蓝虚线,跨整个 .main viewport,延伸到 ruler 区域。
 * z-index 高于 ruler-slot(35),让 self-h 左端能盖住 ruler-v 的 32px 区域,
 * 实现"延伸到左侧标尺"的视觉效果 */
.self-line {
  position: absolute;
  pointer-events: none;
  z-index: 40;
  transition: opacity 80ms;
}
.self-v {
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed #69c0ff;
  opacity: 0.7;
  transform: translateX(-0.5px);
}
.self-h {
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px dashed #69c0ff;
  opacity: 0.7;
  transform: translateY(-0.5px);
}

/* 吸附辅助线:跨整个 .main viewport,ruler 区域也能看到红色短截 */
.snap-line {
  position: absolute;
  background: #ff4d4f;
  pointer-events: none;
  z-index: 40;
  transition: opacity 100ms;
}
.snap-v {
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-0.5px);
}
.snap-h {
  left: 0;
  right: 0;
  height: 1px;
  transform: translateY(-0.5px);
}
</style>
