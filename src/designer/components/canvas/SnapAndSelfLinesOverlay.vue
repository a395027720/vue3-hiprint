<template>
  <!-- 拖动中"延长线 + 选区填充 + snap 命中红线"的浮层。
       父级负责把 mm 坐标用 overlayX/Y 算成 px 后传进来,本组件只渲染。 -->
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
    <span
      v-for="(x, idx) in selfLines.v"
      :key="`self-v-label-${x.id}`"
      class="self-line-label self-v-label"
      :style="{
        left: x.px + 'px',
        transform: idx === 0 ? 'translateX(-100%)' : 'none',
      }"
      >{{ formatMm(x.mm) }}</span
    >
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
    <span
      v-for="(y, idx) in selfLines.h"
      :key="`self-h-label-${y.id}`"
      class="self-line-label self-h-label"
      :style="{
        top: idx === 0 ? y.px - 16 + 'px' : y.px + 'px',
      }"
      >{{ formatMm(y.mm) }}</span
    >
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

function formatMm(mm: number): string {
  return mm.toFixed(1).replace(/\.0$/, "");
}
</script>

<style scoped>
/* 拖动中延长线围成的范围浅蓝半透明填充(z-index 1,被 self-line 虚线盖住) */
.self-fill {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  background: rgba(24, 144, 255, 0.08);
  transition: opacity 80ms;
}

/* 拖动中的延长线:浅蓝虚线,跨整个 .main viewport,延伸到 ruler 区域 */
.self-line {
  position: absolute;
  pointer-events: none;
  z-index: 6;
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
  z-index: 7;
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

/* 延长线 mm 数字 chip:贴 ruler 区域显示当前 mm(z-index 7) */
.self-line-label {
  position: absolute;
  display: inline-block;
  pointer-events: none;
  z-index: 7;
  min-width: 22px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 14px;
  border-radius: 2px;
  white-space: nowrap;
  text-align: center;
  user-select: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
.self-v-label {
  /* chip 贴 ruler-h 区域底部:
     inline left = x.px,transform 根据 v-for idx 区分:
       idx=0 (元素左 x):translateX(-100%) 让 chip 右沿贴虚线
       idx=1 (元素右 x):none 让 chip 左沿贴虚线 */
  top: 32px;
  background: #69c0ff;
  color: #fff;
}
.self-h-label {
  /* chip 底部对齐 self-h 端点(虚线上方):
     inline top = y.px - 16(让 chip 底部贴虚线顶部) */
  left: 32px;
  background: #69c0ff;
  color: #fff;
}
</style>
