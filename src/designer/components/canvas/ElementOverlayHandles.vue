<template>
  <!-- 8 个 resize handle + 1 个 rotate handle + 角度 chip + 锁定徽标。
       作为 .canvas-element 的子元素,跟随元素 rotate 一起转。 -->
  <span v-if="element.locked" class="lock-badge" title="已锁定">🔒</span>
  <template v-if="!element.locked">
    <span
      v-for="h in resizeHandles"
      :key="h.dir"
      class="resize-handle"
      :class="`rh-${h.kind} rh-${h.dir}`"
      :style="handleStyle(element, h.dir)"
      @mousedown.stop="$emit('resize-start', $event, element.id, h.dir)"
    />
    <span
      class="rotate-handle"
      :style="rotateHandleStyleReversed(element)"
      title="拖动旋转"
      @mousedown.stop="$emit('rotate-start', $event, element.id)"
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 2.5a5.5 5.5 0 1 0 5.45 6.3.85.85 0 0 0-1.69-.18 3.8 3.8 0 1 1-1-3.7l-1.3 1.3a.6.6 0 0 0 .42 1.03h3.5a.6.6 0 0 0 .6-.6V3.15a.6.6 0 0 0-1.03-.42l-1.1 1.1A5.48 5.48 0 0 0 8 2.5Z"
        />
      </svg>
    </span>
    <span class="rotate-deg" :style="rotateDegStyle(element)">{{
      element.rotate ?? 0
    }}°</span>
  </template>
</template>

<script setup lang="ts">
import { mmToPx } from "../../core/render";
import type { Element } from "../../core/types";

type ResizeDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const resizeHandles: Array<{ dir: ResizeDir; kind: "corner" | "edge" }> = [
  { dir: "nw", kind: "corner" },
  { dir: "n", kind: "edge" },
  { dir: "ne", kind: "corner" },
  { dir: "e", kind: "edge" },
  { dir: "se", kind: "corner" },
  { dir: "s", kind: "edge" },
  { dir: "sw", kind: "corner" },
  { dir: "w", kind: "edge" },
];

defineProps<{ element: Element }>();

defineEmits<{
  /** 父级收到后启动 onResizeStart */
  "resize-start": [e: MouseEvent, id: string, dir: ResizeDir];
  /** 父级收到后启动 onRotateStart */
  "rotate-start": [e: MouseEvent, id: string];
}>();

/** 角 handle 8x8 实心方块中心对元素 4 角(corner offset = 4),
 *  边 handle 14x3 / 3x14 短条贴边框。
 *  父级 .canvas-scale 用 transform: scale(zoom) 视觉缩放,
 *  handle 在 .canvas-element 内用 raw mm→px,避免重复缩放。 */
function handleStyle(el: Element, dir: ResizeDir) {
  const isCorner = dir === "nw" || dir === "ne" || dir === "sw" || dir === "se";
  const isHorizontal = dir === "n" || dir === "s";
  const offX = isCorner ? 4 : isHorizontal ? 7 : dir === "w" ? 2 : 3;
  const offY = isCorner ? 4 : isHorizontal ? (dir === "n" ? 2 : 3) : 7;
  const posMap: Record<ResizeDir, { fx: number; fy: number; cursor: string }> = {
    nw: { fx: 0, fy: 0, cursor: "nwse-resize" },
    n: { fx: 0.5, fy: 0, cursor: "ns-resize" },
    ne: { fx: 1, fy: 0, cursor: "nesw-resize" },
    e: { fx: 1, fy: 0.5, cursor: "ew-resize" },
    se: { fx: 1, fy: 1, cursor: "nwse-resize" },
    s: { fx: 0.5, fy: 1, cursor: "ns-resize" },
    sw: { fx: 0, fy: 1, cursor: "nesw-resize" },
    w: { fx: 0, fy: 0.5, cursor: "ew-resize" },
  };
  const p = posMap[dir];
  return {
    left: p.fx * mmToPx(el.w) - offX + "px",
    top: p.fy * mmToPx(el.h) - offY + "px",
    cursor: p.cursor,
  };
}

/** 旋转手柄圆点(元素右侧外、垂直居中、距右 8px,反向旋转保持图标正向) */
function rotateHandleStyleReversed(el: Element) {
  return {
    left: mmToPx(el.w) + 8 + "px",
    top: mmToPx(el.h) / 2 - 9 + "px",
    transform: `rotate(${-(el.rotate ?? 0)}deg)`,
  };
}

/** 实时旋转角度文本(元素底边中点下方,反向旋转保持正向可读) */
function rotateDegStyle(el: Element) {
  return {
    left: mmToPx(el.w) / 2 + "px",
    top: mmToPx(el.h) + 6 + "px",
    transform: `translate(-50%, 0) rotate(${-(el.rotate ?? 0)}deg)`,
  };
}
</script>

<style scoped>
.lock-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 14px;
  line-height: 1;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
  pointer-events: none;
  z-index: 1;
}

/* 8 个 resize handle */
.resize-handle {
  position: absolute;
  box-sizing: border-box;
  pointer-events: auto;
  z-index: 2;
}
.rh-corner {
  width: 8px;
  height: 8px;
  background: #1890ff;
  border: 1px solid #fff;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.35);
}
.rh-corner:hover {
  background: #40a9ff;
}
.rh-edge {
  background: #1890ff;
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.35);
}
.rh-edge:hover {
  background: #40a9ff;
}
.rh-n,
.rh-s {
  width: 14px;
  height: 3px;
}
.rh-e,
.rh-w {
  width: 3px;
  height: 14px;
}

/* 旋转手柄 */
.rotate-handle {
  position: absolute;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #1890ff;
  border-radius: 50%;
  color: #1890ff;
  cursor: grab;
  z-index: 3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.rotate-handle:active {
  cursor: grabbing;
}
.rotate-handle:hover {
  background: #e6f7ff;
}

/* 实时角度 chip */
.rotate-deg {
  position: absolute;
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 14px;
  color: #1890ff;
  background: #fff;
  border: 1px solid #1890ff;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 3;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
