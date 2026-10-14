<template>
  <div
    ref="wrapRef"
    class="canvas-wrap"
    :class="{ 'pan-mode': panMode }"
    @mousedown="onWrapMouseDown"
    @contextmenu.prevent="onWrapContextMenu"
    @dragover.prevent="onWrapDragOver"
    @drop="onDrop"
  >
    <div class="canvas-pan" :style="panStyle">
      <div class="canvas-scale" :style="scaleStyle">
        <div
          v-for="(page, pageIndex) in template.pages"
          :key="page.id"
          class="print-page"
          :style="pageStyle(pageIndex)"
        >
          <div
            class="canvas"
            :style="canvasStyle"
            @dragover.prevent
            @drop.stop="onDrop"
            @mousemove="onCanvasMouseMove"
            @mouseleave="onCanvasMouseLeave"
          >
            <div
              v-for="el in page.elements"
              :key="el.id"
              class="canvas-element"
              :class="{
                selected: el.id === selectedId,
                'is-image': el.type === 'image',
                locked: el.locked,
                'multi-selected':
                  isMultiSelected(el.id) && el.id !== selectedId,
                'marquee-hit': marqueeHits.has(el.id),
              }"
              :style="elBox(el)"
              @mousedown="onElementMouseDown($event, el.id)"
              @contextmenu.prevent.stop="onContextMenu($event, el.id)"
            >
              <ElementRenderer :element="el" />
              <span v-if="el.locked" class="lock-badge" title="已锁定">🔒</span>
              <!-- 选中元素的 handle 层(放在 .canvas-element 内,跟着 rotate 一起转) -->
              <template v-if="el.id === selectedId && !el.locked">
                <span
                  v-for="h in resizeHandles"
                  :key="h.dir"
                  class="resize-handle"
                  :class="`rh-${h.kind} rh-${h.dir}`"
                  :style="handleStyle(el, h.dir)"
                  @mousedown.stop="onResizeStart($event, el.id, h.dir)"
                />
                <span
                  class="rotate-line"
                  :style="rotateLineStyle"
                  @mousedown.stop="onRotateStart($event, el.id)"
                />
                <span
                  class="rotate-handle"
                  :style="rotateHandleStyleReversed(el)"
                  title="拖动旋转"
                  @mousedown.stop="onRotateStart($event, el.id)"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M8 2.5a5.5 5.5 0 1 0 5.45 6.3.85.85 0 0 0-1.69-.18 3.8 3.8 0 1 1-1-3.7l-1.3 1.3a.6.6 0 0 0 .42 1.03h3.5a.6.6 0 0 0 .6-.6V3.15a.6.6 0 0 0-1.03-.42l-1.1 1.1A5.48 5.48 0 0 0 8 2.5Z"
                    />
                  </svg>
                </span>
                <span class="rotate-deg" :style="rotateDegStyle(el)"
                  >{{ el.rotate ?? 0 }}°</span
                >
              </template>
            </div>

            <!-- 框选矩形(屏幕坐标,覆盖在 .canvas 上) -->
            <div v-if="marquee" class="marquee-rect" :style="marqueeStyle">
              <span
                v-if="marquee.w >= 4 && marquee.h >= 4"
                class="marquee-size"
              >
                {{ formatMm(marquee.wMm) }} × {{ formatMm(marquee.hMm) }} mm
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户自定义参考线(guides):跨整个 wrap,从 ruler 区域穿过 -->
    <div v-for="g in props.guides" v-show="false" :key="`g-hidden-${g.id}`" />
    <template v-for="g in props.guides ?? []" :key="g.id">
      <div
        v-if="g.axis === 'horizontal'"
        class="guide-line guide-h"
        :class="{ highlighted: props.highlightedGuideId === g.id }"
        :style="{ top: guideYStyle(g.position) }"
        @mouseenter="emit('guideHover', g.id)"
        @mouseleave="emit('guideHover', null)"
        @dblclick.stop="emit('guideRemove', g.id)"
      />
      <div
        v-else
        class="guide-line guide-v"
        :class="{ highlighted: props.highlightedGuideId === g.id }"
        :style="{ left: guideXStyle(g.position) }"
        @mouseenter="emit('guideHover', g.id)"
        @mouseleave="emit('guideHover', null)"
        @dblclick.stop="emit('guideRemove', g.id)"
      />
    </template>

    <!-- 拖动中的"延长线 + 选区填充":跨整个 .canvas-wrap(viewport 高度),
         在 ruler 区域(顶部 0~32 / 左侧 0~32)也能看到浅蓝短截(z-index > ruler)。
         坐标公式 = overlayX/Y(wrap 内画布 mm 位置,已含 scale,扣 pan) -->
    <template v-if="selfLines">
      <div class="self-fill" :style="selfFillStyle" />
      <div
        v-for="x in selfLines.v"
        :key="`self-v-${x}`"
        class="self-line self-v"
        :style="{ left: overlayX(x) + 'px' }"
      />
      <div
        v-for="y in selfLines.h"
        :key="`self-h-${y}`"
        class="self-line self-h"
        :style="{ top: overlayY(y) + 'px' }"
      />
    </template>

    <!-- 吸附命中红线:跨整个 .canvas-wrap -->
    <div
      v-for="x in snapLines.vertical"
      :key="`v-${x}`"
      class="snap-line snap-v"
      :style="{ left: overlayX(x) + 'px' }"
    />
    <div
      v-for="y in snapLines.horizontal"
      :key="`h-${y}`"
      class="snap-line snap-h"
      :style="{ top: overlayY(y) + 'px' }"
    />

    <!-- 标尺已搬到 PrintDesigner 顶部/左侧浮层(Ruler.vue,Canvas 2D) -->

    <!-- 标尺已搬到 PrintDesigner 顶部/左侧浮层(Ruler.vue,Canvas 2D) -->

    <!-- 右键菜单 -->
    <ContextMenu
      :open="ctxMenu.open"
      :pos="ctxMenu.pos"
      :element="computedMenuEl"
      :has-selection="!!computedMenuEl"
      :has-clipboard="!!props.hasClipboard"
      :can-undo="!!props.canUndo"
      :can-redo="!!props.canRedo"
      :can-bring-to-front="canBringToFront"
      :can-send-to-back="canSendToBack"
      :can-move-up="canMoveUp"
      :can-move-down="canMoveDown"
      @close="closeCtxMenu"
      @remove="onCtxRemove"
      @copy="onCtxCopy"
      @cut="onCtxCut"
      @paste="onCtxPaste"
      @bring-to-front="onCtxBringToFront"
      @send-to-back="onCtxSendToBack"
      @move-up="onCtxMoveUp"
      @move-down="onCtxMoveDown"
      @toggle-lock="onCtxToggleLock"
      @undo="onCtxUndo"
      @redo="onCtxRedo"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import type { Element, ElementType, Template } from "../../core/types";
import { mmToPx } from "../../core/render";
import { allElements, findElementGlobal } from "../../core/schema";
import { snapValue } from "../../utils/snap";
import ElementRenderer from "../elements/ElementRenderer.vue";
import ContextMenu from "../floating/ContextMenu.vue";

/** 多页之间的纵向间距(mm)。S2 暂用 0(单页行为不变),S3 接 pageSpacingX/Y。 */
const PAGE_SPACING_MM = 20;

const props = defineProps<{
  template: Template;
  selectedId: string | null;
  /** 画布缩放(1 = 100%,0.5 = 50%) */
  zoom?: number;
  /** 是否显示 5mm 网格 */
  showGrid?: boolean;
  /** 手型拖动模式(空格 / 工具条按钮) */
  panMode?: boolean;
  /** 画布横向偏移(由父组件控制) */
  panX?: number;
  /** 画布纵向偏移 */
  panY?: number;
  /** 内部剪贴板是否有元素(右键菜单 "粘贴" 是否可用) */
  hasClipboard?: boolean;
  /** 撤销是否可用 */
  canUndo?: boolean;
  /** 重做是否可用 */
  canRedo?: boolean;
  /** 多选 id 列表(单选时也含 1 个) */
  multiSelectedIds?: string[];
  /** dark mode 配色 */
  darkMode?: boolean;
  /** 用户自定义参考线 */
  guides?: Array<{
    id: string;
    axis: "horizontal" | "vertical";
    position: number;
    color?: string;
  }>;
  /** 当前 hover 的 guide id */
  highlightedGuideId?: string | null;
}>();

const emit = defineEmits<{
  /** palette 拖入或点击 add。拖入时携带鼠标 mm 坐标(松开位置) */
  add: [type: ElementType, position?: { x: number; y: number }];
  /** 选中元素 id(传 null 取消选中) */
  select: [id: string | null];
  /** 框选结束:批量选中 */
  selectMany: [ids: string[]];
  /** Shift+点击元素:在多选集合里 toggle */
  selectToggle: [id: string];
  /** 元素被拖动(连续触发) */
  move: [id: string, x: number, y: number];
  /** 多选组拖动(连续触发) */
  moveMany: [updates: Array<{ id: string; x: number; y: number }>];
  /** 元素被 resize(连续触发),patch 含 x/y/w/h */
  resize: [id: string, patch: { x: number; y: number; w: number; h: number }];
  /** 元素被旋转(连续触发) */
  rotate: [id: string, deg: number];
  /** 删除元素 */
  remove: [id: string];
  /** 批量删除(多选时 Delete 键) */
  removeMany: [ids: string[]];
  /** 画布被拖动(连续触发) */
  pan: [dx: number, dy: number];
  /** 右键菜单 / 按钮触发(粘贴时携带鼠标 mm 坐标,父组件用) */
  ctxAction: [
    action:
      | "copy"
      | "cut"
      | "paste"
      | "bringToFront"
      | "sendToBack"
      | "moveUp"
      | "moveDown"
      | "toggleLock"
      | "undo"
      | "redo",
    payload?: { id?: string; x?: number; y?: number },
  ];
  /** guide hover(传 id 或 null) */
  guideHover: [id: string | null];
  /** guide 双击删除 */
  guideRemove: [id: string];
  /** 画布 wrap 滚动/wrap size 变化,通知父级重算 ruler offset */
  viewportChange: [];
}>();

// 吸附阈值(单位:mm,4px / 3.78 ≈ 1mm,这里取 1mm 适中)
const SNAP_THRESHOLD_MM = 1;

/** 标尺宽度(px):同时给画布 left/top 让位、所有 frame 级辅助线偏移用 */
const RULER_SIZE = 32;

const zoomValue = computed(() => props.zoom ?? 1);

/** mm → 画布 px(已应用 zoom) */
function mmToPxScaled(mm: number): number {
  return mmToPx(mm) * zoomValue.value;
}

/** 屏幕像素 → mm(用于框选时把屏幕距离转 mm) */
const pxPerMmScreen = computed(() => mmToPx(1) * zoomValue.value);

// ========== 框选 / 多选 ==========

/** 框选矩形(屏幕像素坐标),null = 不在框选 */
const marquee = ref<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
  wMm: number;
  hMm: number;
} | null>(null);

/** 框选过程中实时命中的元素 id(用于实时高亮) */
const marqueeHits = ref<Set<string>>(new Set());

/** 框选启动瞬间的标志:防止 onDocMouseDown 同帧把多选清空 */
const marqueeStarting = ref(false);

/** 当前 multi 集合(含主选) */
const multiIds = computed<Set<string>>(
  () => new Set(props.multiSelectedIds ?? []),
);

function isMultiSelected(id: string): boolean {
  return multiIds.value.has(id);
}

/** 把 mm 数保留 1 位小数 */
function formatMm(mm: number): string {
  return mm.toFixed(1).replace(/\.0$/, "");
}

/** 框选矩形的渲染样式:.marquee-rect 是 .canvas 的子元素,
 *  left/top 用 canvas 内的相对像素(屏幕 clientX - canvas.left) */
const marqueeStyle = computed(() => {
  const m = marquee.value;
  if (!m) return {};
  const canvas = document.querySelector(".canvas") as HTMLElement | null;
  if (!canvas) return {};
  const cr = canvas.getBoundingClientRect();
  return {
    left: m.x1 - cr.left + "px",
    top: m.y1 - cr.top + "px",
    width: m.w + "px",
    height: m.h + "px",
  };
});

/** 元素在屏幕坐标系下的 AABB(已应用 zoom,未考虑 rotate——旋转元素的 AABB 会偏大,框选命中范围更宽容,可接受) */
function elScreenRect(
  el: Element,
): { left: number; top: number; right: number; bottom: number } | null {
  const canvas = document.querySelector(".canvas") as HTMLElement | null;
  if (!canvas) return null;
  const cr = canvas.getBoundingClientRect();
  const px = mmToPxScaled(el.w);
  const py = mmToPxScaled(el.h);
  return {
    left: cr.left + mmToPxScaled(el.x),
    top: cr.top + mmToPxScaled(el.y),
    right: cr.left + mmToPxScaled(el.x) + px,
    bottom: cr.top + mmToPxScaled(el.y) + py,
  };
}

/** 框选过程中实时算命中元素(每帧更新 marqueeHits,用于实时高亮) */
watch(marquee, (m) => {
  if (!m) {
    marqueeHits.value = new Set();
    return;
  }
  const hits = new Set<string>();
  for (const el of allElements(props.template)) {
    if (el.locked) continue;
    const r = elScreenRect(el);
    if (!r) continue;
    if (
      m.x1 <= r.right &&
      m.x2 >= r.left &&
      m.y1 <= r.bottom &&
      m.y2 >= r.top
    ) {
      hits.add(el.id);
    }
  }
  marqueeHits.value = hits;
});

/** 5mm 网格背景:横竖各画一道浅灰 1px 线,间距 5mm。showGrid=false 时透明 */
const gridStyle = computed(() => {
  if (!props.showGrid) return { image: "none", size: "" };
  const step = mmToPx(5);
  return {
    image: [
      `linear-gradient(to right, #e0e0e0 1px, transparent 1px)`,
      `linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)`,
    ].join(","),
    size: `${step}px ${step}px`,
  };
});

const canvasStyle = computed(() => ({
  // 父级 .canvas-scale 的 transform: scale(zoom) 视觉缩放,这里用 raw mm→px
  width: mmToPx(props.template.paper.width) + "px",
  height: mmToPx(props.template.paper.height) + "px",
  backgroundImage: gridStyle.value.image,
  backgroundSize: gridStyle.value.size || undefined,
}));

/** 单个 page 的尺寸(S2:多页用 .canvas-scale 的 flex-col + rowGap 自动堆叠,不再 transform) */
function pageStyle(_pageIndex: number) {
  return {
    width: mmToPx(props.template.paper.width) + "px",
    height: mmToPx(props.template.paper.height) + "px",
  };
}

/** 画布在 .canvas-wrap 内的 0mm 偏移(wrap 内居中布局,wrap 高度 = viewport 高度) */
const wrapRef = ref<HTMLElement | null>(null);
const wrapSize = ref({ w: 0, h: 0 });
function measureWrap() {
  const w = wrapRef.value;
  if (!w) return;
  wrapSize.value = { w: w.clientWidth, h: w.clientHeight };
  // 通知父级重算 ruler offset(wrap size 变化,canvas 居中位置变)
  emit("viewportChange");
}
function onWrapScroll() {
  // wrap 滚动改变 canvas 视觉位置,触发 ruler 重算
  emit("viewportChange");
}
onMounted(() => {
  measureWrap();
  if (wrapRef.value && "ResizeObserver" in window) {
    new ResizeObserver(measureWrap).observe(wrapRef.value);
  }
  if (wrapRef.value) {
    wrapRef.value.addEventListener("scroll", onWrapScroll, { passive: true });
  }
});
// wrap 用 flex 布局:水平居中(justify-content: center)+ 垂直顶对齐(align-items: flex-start)
// offsetX = (wrapW - paperW*zoom) / 2;offsetY = 0(顶对齐,画布 0mm 跟 ruler 0 刻度重合)
// 注:pan 在 .canvas-pan 上用 transform translate,不参与 wrap 居中计算
const offsetX = computed(() => {
  return Math.max(
    0,
    (wrapSize.value.w - mmToPx(props.template.paper.width) * zoomValue.value) /
      2,
  );
});
const offsetY = computed(() => 0);

/** 画布 0mm 距 wrap 顶的间距(对应 .canvas top:50)
 *  overlay 公式需要包含这个间距,才能跟画布 0mm 视觉对齐 */
const CANVAS_TOP_GAP = 50;

/** mm 位置 → overlay 屏幕 px(.canvas-wrap 局部,已含 scale,加 pan)
 *  用于 guide / self-line / snap-line / selfFill 浮层(不经过 scale 父级)
 *  .canvas-pan 用 transform: translate(panX, panY) 推画布,overlay 浮在 wrap 内
 *  绝对定位,要跟画布一起平移,所以 pan 是 + 不是 - */
function overlayX(valMm: number): number {
  return offsetX.value + mmToPx(valMm) * zoomValue.value + (props.panX ?? 0);
}
function overlayY(valMm: number): number {
  return (
    CANVAS_TOP_GAP +
    offsetY.value +
    mmToPx(valMm) * zoomValue.value +
    (props.panY ?? 0)
  );
}

/** 画布整体框(标尺已搬到 PrintDesigner 顶部浮层,这里 frame 只装画布 + 自线) */
const frameStyle = computed(() => {
  const w = mmToPx(props.template.paper.width);
  const pages = props.template.pages.length;
  const singleH = mmToPx(props.template.paper.height);
  const spacing = mmToPx(PAGE_SPACING_MM);
  const h = Math.max(singleH, pages * singleH + (pages - 1) * spacing);
  return {
    width: w + "px",
    height: h + "px",
    widthPx: w,
    heightPx: singleH, // cursor chip / 延长线仍按单页纸算
  };
});

/** .canvas-pan 单独承接 pan(在 .canvas-scale 之外,不被 scale 二次缩放) */
const panStyle = computed(() => ({
  transform: `translate(${props.panX ?? 0}px, ${props.panY ?? 0}px)`,
}));

/** .canvas-scale 根:transform: scale(zoom) + transformOrigin: top left,
 *  跟 Vue-Print-Designer Canvas.vue 根 div 一致;子节点(mm 数值)由 scale 视觉缩放 */
const scaleStyle = computed(() => ({
  transform: `scale(${zoomValue.value})`,
  transformOrigin: "top left",
  width: "fit-content",
}));

/** 画布 wrap 上的 mousedown:
 *  - panMode 时启动平移拖动
 *  - 否则在 .canvas 空白处启动框选(非元素 / 非 handle)
 *  注意:shift 按下时走元素自己的 toggle 分支(元素 mousedown 自行处理),
 *  不在这里启动框选。 */
function onWrapMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  if (e.shiftKey) return;
  // 落在 ctx 菜单内:交给菜单自己处理(它的 onDocMouseDown 监听会兜底关)
  if (target.closest(".ctx-menu")) return;
  // 画布任意 mousedown:右键菜单开着就先关掉(避免 stopPropagation 阻断 document 监听)
  if (ctxMenu.open) {
    ctxMenu.open = false;
    ctxMenu.onElement = false;
  }
  // panMode:启动平移
  if (props.panMode) {
    if (target.closest(".canvas-element")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = props.panX ?? 0;
    const baseY = props.panY ?? 0;
    function onMove(ev: MouseEvent) {
      emit(
        "pan",
        baseX + (ev.clientX - startX) - (props.panX ?? 0),
        baseY + (ev.clientY - startY) - (props.panY ?? 0),
      );
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return;
  }
  // 元素 / handle 上不启动框选
  if (target.closest(".canvas-element")) return;
  // 框选必须落在画布纸上(.canvas),ruler / frame 留白处不启动(避免误框)
  if (!target.closest(".canvas") && !target.classList.contains("canvas"))
    return;

  e.preventDefault();
  e.stopPropagation(); // 阻止冒泡到 document 触发 onDocMouseDown 把多选清空
  // 启动时清掉单选/多选(进入"全新框选"模式)
  if (
    props.selectedId ||
    (props.multiSelectedIds && props.multiSelectedIds.length > 0)
  ) {
    emit("selectMany", []);
  }
  marqueeStarting.value = true;
  queueMicrotask(() => {
    marqueeStarting.value = false;
  });
  const startX = e.clientX;
  const startY = e.clientY;

  function onMove(ev: MouseEvent) {
    const x1 = Math.min(startX, ev.clientX);
    const y1 = Math.min(startY, ev.clientY);
    const x2 = Math.max(startX, ev.clientX);
    const y2 = Math.max(startY, ev.clientY);
    const ppm = pxPerMmScreen.value;
    marquee.value = {
      x1,
      y1,
      x2,
      y2,
      w: x2 - x1,
      h: y2 - y1,
      wMm: (x2 - x1) / ppm,
      hMm: (y2 - y1) / ppm,
    };
  }
  function onUp(ev: MouseEvent) {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    const m = marquee.value;
    if (!m) return;
    // 鼠标没动:当作"点空白处"→ 清选中
    if (m.w < 3 && m.h < 3) {
      marquee.value = null;
      marqueeHits.value = new Set();
      return;
    }
    // 收集命中的元素 id(屏幕坐标相交,锁定元素除外)
    const hits: string[] = [];
    for (const el of allElements(props.template)) {
      if (el.locked) continue;
      const r = elScreenRect(el);
      if (!r) continue;
      if (
        m.x1 <= r.right &&
        m.x2 >= r.left &&
        m.y1 <= r.bottom &&
        m.y2 >= r.top
      ) {
        hits.push(el.id);
      }
    }
    marquee.value = null;
    marqueeHits.value = new Set();
    emit("selectMany", hits);
    void ev;
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

/**
 * 刻度数组:根据 zoom 自适应密度(越大越密)。
 *  mm === 0 是 zero tick(加粗深色),mm % major === 0 是 major(长 + 数字),
 *  其余是 minor(短)。
 */

/** 根据 zoom 选 major / minor 间距
 *  - zoom ≥ 0.6: major 10mm,minor 1mm(每 1mm 一条细线,10mm 带数字;默认 zoom=1)
 *  - zoom < 0.6: major 20mm,minor 5mm(缩小后避免刻度过密) */
function chooseStep(zoom: number): { major: number; minor: number } {
  if (zoom >= 0.6) return { major: 10, minor: 1 };
  return { major: 20, minor: 5 };
}

function buildTicks(
  axisLen: number,
  axis: "x" | "y",
): Array<{
  mm: number;
  x: number;
  major: boolean;
  zero: boolean;
  inCanvas: boolean;
}> {
  const { major: majorStep, minor: minorStep } = chooseStep(zoomValue.value);
  const ticks: Array<{
    mm: number;
    x: number;
    major: boolean;
    zero: boolean;
    inCanvas: boolean;
  }> = [];
  // ruler 跟画布走,刻度范围 0 ~ axisLen,每 minorStep 一个
  const firstTick = Math.ceil(0 / minorStep) * minorStep;
  const endMm = axisLen;
  for (let mm = firstTick; mm <= endMm; mm += minorStep) {
    const x = mmToPxScaled(mm);
    const zero = mm === 0;
    const major = mm % majorStep === 0;
    const inCanvas = mm >= 0 && mm <= axisLen;
    if (zero || major || mm % minorStep === 0) {
      ticks.push({ mm, x, major, zero, inCanvas });
    }
  }
  // 末尾强制 tick:保证 ruler 视觉末端有刻度,即使 axisLen 不是 minorStep 倍数
  const lastInLoop = ticks[ticks.length - 1];
  if (!lastInLoop || Math.abs(axisLen - lastInLoop.mm) > minorStep / 2) {
    ticks.push({
      mm: axisLen,
      x: mmToPxScaled(axisLen),
      major: false,
      zero: false,
      inCanvas: true,
    });
  }
  return ticks;
}

/** ruler 跟 .canvas-frame 一起走,刻度范围 = 画布 0 ~ paper.w/h */
const hTicks = computed(() => buildTicks(props.template.paper.width, "x"));
const vTicks = computed(() => buildTicks(props.template.paper.height, "y"));

const snapLines = reactive<{ vertical: number[]; horizontal: number[] }>({
  vertical: [],
  horizontal: [],
});

/** 当前选中元素(handle 层需要) */
const selectedEl = computed<Element | null>(() => {
  if (!props.selectedId) return null;
  return findElementGlobal(props.template, props.selectedId)?.el ?? null;
});

/** 拖动中"延长线":从元素/组的 4 边出发画虚线(贯穿画布到 ruler)。
 *  null = 不在拖动。跟 snapLines(吸附命中红线)叠加:吸附时红线盖在虚线上表示"已对齐"。 */
const selfLines = ref<{ v: number[]; h: number[] } | null>(null);

// ========== 标尺:已搬到 .canvas-frame 内(跟画布走),不再用 viewport overlay ==========

// ========== 标尺:鼠标游标 + 选中元素位置标记 ==========

/** 鼠标在画布内的位置(同时给水平/垂直标尺用) */
const mousePos = ref<{
  /** 鼠标在 canvas 内的 px(从 canvas 左上角算) */
  xPx: number;
  yPx: number;
  /** 鼠标在 canvas 内的 mm */
  xMm: number;
  yMm: number;
  /** 是否在画布内(0 ≤ mm ≤ paper) */
  inCanvas: boolean;
} | null>(null);

/** 当前是否有任何选中(主选 / 多选) */
const hasSelection = computed(
  () =>
    !!props.selectedId ||
    (props.multiSelectedIds && props.multiSelectedIds.length > 0),
);

/** 拖动中延长线围成的矩形(选区浅蓝填充),从 selfLines 算出 */
const selfFillStyle = computed(() => {
  const sl = selfLines.value;
  if (!sl) return {};
  const x1 = Math.min(...sl.v);
  const x2 = Math.max(...sl.v);
  const y1 = Math.min(...sl.h);
  const y2 = Math.max(...sl.h);
  return {
    left: overlayX(x1) + "px",
    top: overlayY(y1) + "px",
    width: mmToPx(x2 - x1) * zoomValue.value + "px",
    height: mmToPx(y2 - y1) * zoomValue.value + "px",
  };
});

/** 鼠标游标 chip 位置(ruler 跟 canvas 走,viewBox 0 = canvas 0mm,直接用 mousePos.xPx) */
function cursorChipX(): number {
  if (!mousePos.value) return 0;
  const x = mousePos.value.xPx + 4;
  // 距右边界 < 40 时,改为显示在鼠标左侧
  const totalW = frameStyle.value.widthPx;
  if (x + 40 > totalW) return Math.max(0, mousePos.value.xPx - 40);
  return x;
}
function cursorChipY(): number {
  if (!mousePos.value) return 0;
  const y = mousePos.value.yPx + 4;
  const totalH = frameStyle.value.heightPx;
  if (y + 18 > totalH) return Math.max(0, mousePos.value.yPx - 18);
  return y;
}

/** guide mm 位置 → wrap 内 px(水平线) */
function guideYStyle(positionMm: number): string {
  return overlayY(positionMm) + "px";
}
/** guide mm 位置 → wrap 内 px(垂直线) */
function guideXStyle(positionMm: number): string {
  return overlayX(positionMm) + "px";
}

function elBox(el: Element) {
  // 元素用 raw mm→px 数值,父级 .canvas-scale 的 transform: scale(zoom) 视觉缩放
  // 这样跟 Vue-Print-Designer 的 Canvas.vue 一致:子节点不感知 zoom
  return {
    left: mmToPx(el.x) + "px",
    top: mmToPx(el.y) + "px",
    width: mmToPx(el.w) + "px",
    height: mmToPx(el.h) + "px",
    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
    transformOrigin: "center",
  };
}

function onDrop(e: DragEvent) {
  const type = e.dataTransfer?.getData("text/plain") as ElementType;
  if (!type) return;
  // 拖入时按松开位置放置:用 .canvas 自身的 rect 算局部 px
  // (frame 包含 page 错开 + padding,直接用 frame 会把元素推到中间)
  const canvas = (e.currentTarget as HTMLElement).classList.contains("canvas")
    ? (e.currentTarget as HTMLElement)
    : ((e.currentTarget as HTMLElement).querySelector(
        ".canvas",
      ) as HTMLElement | null);
  if (!canvas) {
    emit("add", type);
    return;
  }
  const cr = canvas.getBoundingClientRect();
  const localX = e.clientX - cr.left;
  const localY = e.clientY - cr.top;
  if (localX < 0 || localY < 0) {
    emit("add", type);
    return;
  }
  const z = zoomValue.value;
  const x = localX / (mmToPx(1) * z);
  const y = localY / (mmToPx(1) * z);
  emit("add", type, { x, y });
}

function onWrapDragOver(e: DragEvent) {
  // 仅占位,模板上 .prevent 已让 drop 生效
  void e;
}

/** 鼠标在画布上:更新标尺游标位置(同时给水平/垂直标尺) */
function onCanvasMouseMove(e: MouseEvent) {
  const canvas = e.currentTarget as HTMLElement;
  const rect = canvas.getBoundingClientRect();
  const xPx = e.clientX - rect.left;
  const yPx = e.clientY - rect.top;
  const z = zoomValue.value;
  const xMm = xPx / (mmToPx(1) * z);
  const yMm = yPx / (mmToPx(1) * z);
  const inCanvas =
    xMm >= 0 &&
    xMm <= props.template.paper.width &&
    yMm >= 0 &&
    yMm <= props.template.paper.height;
  mousePos.value = { xPx, yPx, xMm, yMm, inCanvas };
}
function onCanvasMouseLeave() {
  mousePos.value = null;
}

/**
 * 收集某个轴上的 snap 候选:画布 0/边界 + 其它元素的 4 条边
 */
function collectCandidates(axis: "x" | "y", excludeId: string): number[] {
  const tpl = props.template;
  const list: number[] =
    axis === "x" ? [0, tpl.paper.width] : [0, tpl.paper.height];
  for (const e of allElements(tpl)) {
    if (e.id === excludeId) continue;
    if (axis === "x") {
      list.push(e.x, e.x + e.w);
    } else {
      list.push(e.y, e.y + e.h);
    }
  }
  return list;
}

function onElementMouseDown(e: MouseEvent, id: string) {
  const el = findElementGlobal(props.template, id)?.el;
  if (!el) return;
  // Shift+点击:在多选里 toggle,不发 selectMany(只是 toggle 1 个)
  if (e.shiftKey) {
    e.preventDefault();
    emit("selectToggle", id);
    return;
  }
  // 多选组拖动:如果点中的元素在多选集合里,整组一起平移
  if (
    props.multiSelectedIds &&
    props.multiSelectedIds.length > 1 &&
    props.multiSelectedIds.includes(id)
  ) {
    startGroupDrag(e, id);
    return;
  }
  // 普通:单选(也清空多选)
  emit("select", id);
  if (el.locked) return;
  startElementDrag(e, id);
}

/** 单元素拖动(原 onElementMouseDown 主体) */
function startElementDrag(e: MouseEvent, id: string) {
  const el = findElementGlobal(props.template, id)?.el;
  if (!el) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const origX = el.x;
  const origY = el.y;
  const pxPerMmLocal = mmToPx(1) * zoomValue.value;
  const vCandidates = collectCandidates("x", id);
  const hCandidates = collectCandidates("y", id);
  // 启动时设延长线
  selfLines.value = {
    v: [origX, origX + el.w],
    h: [origY, origY + el.h],
  };

  function onMove(ev: MouseEvent) {
    const dx = (ev.clientX - startX) / pxPerMmLocal;
    const dy = (ev.clientY - startY) / pxPerMmLocal;
    let newX = Math.max(0, origX + dx);
    let newY = Math.max(0, origY + dy);
    const newRight = newX + el.w;
    const newBottom = newY + el.h;

    const sxLeft = snapValue(newX, vCandidates, SNAP_THRESHOLD_MM);
    const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM);
    const syTop = snapValue(newY, hCandidates, SNAP_THRESHOLD_MM);
    const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM);

    if (sxLeft.lineAt !== null) newX = sxLeft.value;
    else if (sxRight.lineAt !== null) newX = sxRight.value - el.w;
    if (syTop.lineAt !== null) newY = syTop.value;
    else if (syBottom.lineAt !== null) newY = syBottom.value - el.h;

    const vLines = [sxLeft.lineAt, sxRight.lineAt].filter(
      (v): v is number => v !== null,
    );
    const hLines = [syTop.lineAt, syBottom.lineAt].filter(
      (v): v is number => v !== null,
    );
    snapLines.vertical = vLines;
    snapLines.horizontal = hLines;
    // 延长线跟随
    if (selfLines.value) {
      selfLines.value = {
        v: [newX, newX + el.w],
        h: [newY, newY + el.h],
      };
    }

    emit("move", id, newX, newY);
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    snapLines.vertical = [];
    snapLines.horizontal = [];
    selfLines.value = null;
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

/** 多选组拖动:点中元素如果在多选集合里,所有选中元素(锁定除外)一起平移,保持相对位置 */
function startGroupDrag(e: MouseEvent, primaryId: string) {
  const ids = (props.multiSelectedIds ?? []).filter((x) => x !== primaryId);
  ids.unshift(primaryId); // 主选放第一个(让吸附候选收集时排除自己)
  // 收集每个元素的起始位置
  const origs = ids
    .map((id) => {
      const el = findElementGlobal(props.template, id)?.el;
      return el ? { id, x: el.x, y: el.y, locked: !!el.locked } : null;
    })
    .filter(
      (x): x is { id: string; x: number; y: number; locked: boolean } =>
        x !== null,
    );
  const draggables = origs.filter((o) => !o.locked);
  if (draggables.length === 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const pxPerMmLocal = mmToPx(1) * zoomValue.value;
  // 吸附候选:组 4 边作为"自己",跟其它元素(非组内)+ 画布边界做吸附
  // 组内元素互不吸附(组已经是一个整体)
  const groupX = origs.reduce((acc, o) => Math.min(acc, o.x), Infinity);
  const groupY = origs.reduce((acc, o) => Math.min(acc, o.y), Infinity);
  const primaryEl = draggables[0]
    ? findElementGlobal(props.template, draggables[0].id)?.el
    : null;
  const groupRight =
    origs.reduce((acc, o) => Math.max(acc, o.x), -Infinity) +
    (primaryEl?.w ?? 0);
  const groupBottom =
    origs.reduce((acc, o) => Math.max(acc, o.y), -Infinity) +
    (primaryEl?.h ?? 0);
  // 用组原始 w/h(拖动过程中变化),这里 groupRight - groupX = 组原始宽
  const groupW = groupRight - groupX;
  const groupH = groupBottom - groupY;
  // 其它元素的边(排除组内全部 id)
  const vCandidates = collectCandidatesForGroup(
    "x",
    new Set(origs.map((o) => o.id)),
  );
  const hCandidates = collectCandidatesForGroup(
    "y",
    new Set(origs.map((o) => o.id)),
  );
  // 启动时设延长线(组 4 边)
  selfLines.value = {
    v: [groupX, groupRight],
    h: [groupY, groupBottom],
  };

  function onMove(ev: MouseEvent) {
    const dx = (ev.clientX - startX) / pxPerMmLocal;
    const dy = (ev.clientY - startY) / pxPerMmLocal;
    let newX = Math.max(0, groupX + dx);
    let newY = Math.max(0, groupY + dy);
    const newRight = newX + groupW;
    const newBottom = newY + groupH;
    const sxLeft = snapValue(newX, vCandidates, SNAP_THRESHOLD_MM);
    const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM);
    const syTop = snapValue(newY, hCandidates, SNAP_THRESHOLD_MM);
    const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM);
    if (sxLeft.lineAt !== null) newX = sxLeft.value;
    else if (sxRight.lineAt !== null) newX = sxRight.value - groupW;
    if (syTop.lineAt !== null) newY = syTop.value;
    else if (syBottom.lineAt !== null) newY = syBottom.value - groupH;

    const vLines = [sxLeft.lineAt, sxRight.lineAt].filter(
      (v): v is number => v !== null,
    );
    const hLines = [syTop.lineAt, syBottom.lineAt].filter(
      (v): v is number => v !== null,
    );
    snapLines.vertical = vLines;
    snapLines.horizontal = hLines;
    // 延长线跟随
    if (selfLines.value) {
      selfLines.value = {
        v: [newX, newRight],
        h: [newY, newBottom],
      };
    }

    const finalDx = newX - groupX;
    const finalDy = newY - groupY;
    const updates = draggables.map((o) => ({
      id: o.id,
      x: o.x + finalDx,
      y: o.y + finalDy,
    }));
    emit("moveMany", updates);
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    snapLines.vertical = [];
    snapLines.horizontal = [];
    selfLines.value = null;
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

/** 类似 collectCandidates,但可以排除一组 id(组拖动用) */
function collectCandidatesForGroup(
  axis: "x" | "y",
  excludeIds: Set<string>,
): number[] {
  const tpl = props.template;
  const list: number[] =
    axis === "x" ? [0, tpl.paper.width] : [0, tpl.paper.height];
  for (const e of allElements(tpl)) {
    if (excludeIds.has(e.id)) continue;
    if (axis === "x") list.push(e.x, e.x + e.w);
    else list.push(e.y, e.y + e.h);
  }
  return list;
}

// ========== Resize / Rotate ==========

type ResizeDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const MIN_SIZE_MM = 4;

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

/** 计算单个 handle 的位置/光标(绝对像素,handle 在 canvas 坐标系下作为兄弟节点)。
 *  角 handle 用 10x10 框(L 在框内),边 handle 用 14x3 / 3x14 短条,
 *  所以 offset 不同(corner = 5,edge-横 = 7x1.5,edge-竖 = 1.5x7)。
 */
function handleStyle(el: Element, dir: ResizeDir) {
  const isCorner = dir === "nw" || dir === "ne" || dir === "sw" || dir === "se";
  const isHorizontal = dir === "n" || dir === "s";
  const offX = isCorner ? 5 : isHorizontal ? 7 : 1.5;
  const offY = isCorner ? 5 : isHorizontal ? 1.5 : 7;
  const posMap: Record<ResizeDir, { fx: number; fy: number; cursor: string }> =
    {
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
  // handle 现在是 .canvas-element 的子元素,坐标相对元素盒 0~w / 0~h
  return {
    left: p.fx * mmToPxScaled(el.w) - offX + "px",
    top: p.fy * mmToPxScaled(el.h) - offY + "px",
    cursor: p.cursor,
  };
}

/** 旋转连杆线(元素顶边中点 → 旋转手柄,相对元素盒的 0~w / 0~h 坐标)
 *  handle 现在在 .canvas-element 内,坐标以元素盒左上角为原点。 */
const rotateLineStyle = computed(() => {
  const e = selectedEl.value;
  if (!e) return {};
  const cx = mmToPxScaled(e.w) / 2;
  return {
    left: cx - 0.5 + "px",
    top: "0px",
    width: "1px",
    height: "20px",
  };
});

/** 旋转手柄圆点(handle 现在在 .canvas-element 内,坐标用相对位置;
 *  反向旋转 -el.rotate 让旋转图标始终保持正向)。
 *  元素盒 (x, y, w, h) 中:手柄放在顶边中点上方 30px 处。 */
function rotateHandleStyleReversed(el: Element) {
  return {
    left: mmToPxScaled(el.w) / 2 - 9 + "px",
    top: -30 + "px",
    transform: `rotate(${-(el.rotate ?? 0)}deg)`,
  };
}

/** 实时旋转角度文本(元素底边中点下方,反向旋转保持正向可读) */
function rotateDegStyle(el: Element) {
  return {
    left: mmToPxScaled(el.w) / 2 + "px",
    top: mmToPxScaled(el.h) + 6 + "px",
    transform: `translate(-50%, 0) rotate(${-(el.rotate ?? 0)}deg)`,
  };
}

/**
 * 启动 resize 拖拽。
 * 用元素盒的屏幕坐标 + 鼠标增量来反推新 x/y/w/h(保证 zoom 下视觉一致),
 * mouseup 提交最终值。Shift 修饰键在角 handle 上保持等比。
 */
function onResizeStart(e: MouseEvent, id: string, dir: ResizeDir) {
  e.preventDefault();
  const found = findElementGlobal(props.template, id);
  if (!found) return;
  const el = found.el;
  if (el.locked) return; // 锁定后不允许 resize
  const startMouseX = e.clientX;
  const startMouseY = e.clientY;
  const origX = el.x;
  const origY = el.y;
  const origW = el.w;
  const origH = el.h;
  const pxPerMmLocal = mmToPx(1) * zoomValue.value;
  const ratio = origW / origH;
  const isCorner = dir === "nw" || dir === "ne" || dir === "sw" || dir === "se";

  function onMove(ev: MouseEvent) {
    const dxMm = (ev.clientX - startMouseX) / pxPerMmLocal;
    const dyMm = (ev.clientY - startMouseY) / pxPerMmLocal;
    const shift = ev.shiftKey && isCorner;
    let x = origX;
    let y = origY;
    let w = origW;
    let h = origH;
    // 横向(对 w / x 起作用的方向)
    if (dir === "nw" || dir === "w" || dir === "sw") {
      w = Math.max(MIN_SIZE_MM, origW - dxMm);
      x = origX + (origW - w);
    } else if (dir === "ne" || dir === "e" || dir === "se") {
      w = Math.max(MIN_SIZE_MM, origW + dxMm);
    }
    // 纵向(对 h / y 起作用的方向)
    if (dir === "nw" || dir === "n" || dir === "ne") {
      h = Math.max(MIN_SIZE_MM, origH - dyMm);
      y = origY + (origH - h);
    } else if (dir === "sw" || dir === "s" || dir === "se") {
      h = Math.max(MIN_SIZE_MM, origH + dyMm);
    }
    // Shift 等比
    if (shift) {
      if (dir === "nw" || dir === "ne" || dir === "se" || dir === "sw") {
        const newH = w / ratio;
        if (dir === "nw" || dir === "ne") y = origY + (origH - newH);
        h = newH;
      }
    }
    emit("resize", id, { x, y, w, h });
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

/**
 * 启动旋转拖拽。
 * 用元素在未旋转时的几何中心(由 x/y/w/h 算出)作为旋转中心,
 * 计算鼠标相对中心的 atan2 → 度数。+90° 偏移让"拖柄朝正上方"对应 0°。
 *
 * 用 canvas 的实际 bounding rect 把元素中心转屏幕坐标,这样不受 wrap padding /
 * pan / scroll 影响。
 */
function onRotateStart(e: MouseEvent, id: string) {
  e.preventDefault();
  const found = findElementGlobal(props.template, id);
  if (!found) return;
  const el = found.el;
  if (el.locked) return; // 锁定后不允许旋转
  // 用 .canvas 的实际 bounding rect(已含 scale + pan)算元素中心屏幕坐标
  const canvas = (e.currentTarget as HTMLElement).closest(
    ".canvas",
  ) as HTMLElement | null;
  if (!canvas) return;
  const cr = canvas.getBoundingClientRect();
  const z = zoomValue.value;
  // 元素未旋转中心(屏幕坐标) = canvas left + (x + w/2) * pxPerMm * zoom
  const cx = cr.left + mmToPx(el.x + el.w / 2) * z;
  const cy = cr.top + mmToPx(el.y + el.h / 2) * z;

  function onMove(ev: MouseEvent) {
    const dx = ev.clientX - cx;
    const dy = ev.clientY - cy;
    // atan2(dy, dx) 是从 x 轴正方向逆时针的角度;CSS rotate 顺时针为正
    const deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    emit("rotate", id, Math.round(deg));
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

// ========== Context Menu ==========

const ctxMenu = reactive<{
  open: boolean;
  pos: { x: number; y: number };
  /** 仅记录"是不是在元素上右键打开的菜单";具体 element 用 computedMenuEl 实时查 */
  onElement: boolean;
}>({ open: false, pos: { x: 0, y: 0 }, onElement: false });

/** 菜单要展示/操作的元素 = 选中元素。响应式跟随 template + selectedId 变化,
 *  避免右键打开后元素状态变更时菜单的 label (锁定/取消锁定) 失真。 */
const computedMenuEl = computed<Element | null>(() => {
  if (!ctxMenu.open || !ctxMenu.onElement) return null;
  const id = props.selectedId;
  return id ? (findElementGlobal(props.template, id)?.el ?? null) : null;
});

/** 右键点击元素时记录鼠标屏幕坐标(用于 paste 定位:把元素粘到鼠标处) */
const lastCtxClient = ref<{ x: number; y: number } | null>(null);

function onContextMenu(e: MouseEvent, id: string) {
  emit("select", id);
  ctxMenu.open = true;
  ctxMenu.onElement = true;
  ctxMenu.pos = { x: e.clientX, y: e.clientY };
  lastCtxClient.value = { x: e.clientX, y: e.clientY };
}

/** 在 .canvas-wrap 空白处右键时也弹出菜单(onElement=false → computedMenuEl=null) */
function onWrapContextMenu(e: MouseEvent) {
  ctxMenu.open = true;
  ctxMenu.onElement = false;
  ctxMenu.pos = { x: e.clientX, y: e.clientY };
  lastCtxClient.value = { x: e.clientX, y: e.clientY };
}

function closeCtxMenu() {
  ctxMenu.open = false;
  ctxMenu.onElement = false;
}

/** 把屏幕 client 坐标转 canvas-mm(给 paste 用) */
function clientToCanvasMm(
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  // 用 .canvas 自身 rect(已含 scale + pan)算局部 px
  const canvas = document.querySelector(".canvas") as HTMLElement | null;
  if (!canvas) return null;
  const cr = canvas.getBoundingClientRect();
  const localX = clientX - cr.left;
  const localY = clientY - cr.top;
  if (localX < 0 || localY < 0) return null;
  const z = zoomValue.value;
  return { x: localX / (mmToPx(1) * z), y: localY / (mmToPx(1) * z) };
}

/** 计算置顶/置底/上移/下移按钮是否可用(已在最顶/底则禁,S2:在元素所在 page 内判断) */
const canBringToFront = computed(() => {
  const e = computedMenuEl.value;
  if (!e) return false;
  const found = findElementGlobal(props.template, e.id);
  if (!found) return false;
  const page = props.template.pages[found.pageIndex];
  return page.elements[page.elements.length - 1]?.id !== e.id;
});
const canSendToBack = computed(() => {
  const e = computedMenuEl.value;
  if (!e) return false;
  const found = findElementGlobal(props.template, e.id);
  if (!found) return false;
  return props.template.pages[found.pageIndex].elements[0]?.id !== e.id;
});
const canMoveUp = canBringToFront;
const canMoveDown = canSendToBack;

function onCtxRemove() {
  const e = computedMenuEl.value;
  if (e) emit("remove", e.id);
  closeCtxMenu();
}
function onCtxCopy() {
  emit("ctxAction", "copy", { id: computedMenuEl.value?.id });
  closeCtxMenu();
}
function onCtxCut() {
  emit("ctxAction", "cut", { id: computedMenuEl.value?.id });
  closeCtxMenu();
}
function onCtxPaste() {
  let x: number | undefined;
  let y: number | undefined;
  if (lastCtxClient.value) {
    const mm = clientToCanvasMm(lastCtxClient.value.x, lastCtxClient.value.y);
    if (mm) {
      x = mm.x;
      y = mm.y;
    }
  }
  emit("ctxAction", "paste", { x, y });
  closeCtxMenu();
}
function onCtxBringToFront() {
  emit("ctxAction", "bringToFront", { id: computedMenuEl.value?.id });
  closeCtxMenu();
}
function onCtxSendToBack() {
  emit("ctxAction", "sendToBack", { id: computedMenuEl.value?.id });
  closeCtxMenu();
}
function onCtxMoveUp() {
  emit("ctxAction", "moveUp", { id: computedMenuEl.value?.id });
  closeCtxMenu();
}
function onCtxMoveDown() {
  emit("ctxAction", "moveDown", { id: computedMenuEl.value?.id });
  closeCtxMenu();
}
function onCtxToggleLock() {
  emit("ctxAction", "toggleLock", { id: computedMenuEl.value?.id });
  closeCtxMenu();
}
function onCtxUndo() {
  emit("ctxAction", "undo");
  closeCtxMenu();
}
function onCtxRedo() {
  emit("ctxAction", "redo");
  closeCtxMenu();
}

// ========== 点画布空白处取消选中 ==========
// 用 document mousedown 监听(比 @click.self 更可靠:跨浏览器 + 不被
// 元素内 mousedown 提前 stopPropagation 干扰),点中任意 .canvas-element
// 时不取消,其它都取消。canvas-frame / ruler / snap-line 也算"内部"。

function onDocMouseDown(e: MouseEvent) {
  if (marqueeStarting.value) return;
  const target = e.target as HTMLElement | null;
  if (!target) return;
  // 命中 .canvas-element → 保留选中(元素的 mousedown 会自己处理 select)
  if (target.closest(".canvas-element")) return;
  // 命中右键菜单 → 保留选中(菜单的 action handler 自己处理;否则点菜单
  // 时 mousedown 会先于 click 触发,把 selected 置 null,导致 toggleLock
  // 读到 e?.locked === undefined,反复 setLocked(id, true))
  if (target.closest(".ctx-menu")) return;
  // 命中框选矩形 → 不动(矩形自身 pointer-events: none,但兜底)
  if (target.closest(".marquee-rect")) return;
  // 命中画布外部(如 TopBar / HeaderToolbar / PropertyPanel)→ 不动
  if (!target.closest(".canvas-wrap")) return;
  // 命中画布空白(canvas / ruler / frame 等都算空白)→ 取消选中
  if (
    props.selectedId ||
    (props.multiSelectedIds && props.multiSelectedIds.length > 0)
  ) {
    emit("selectMany", []);
  }
}

onMounted(() => document.addEventListener("mousedown", onDocMouseDown));
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocMouseDown);
  if (wrapRef.value) wrapRef.value.removeEventListener("scroll", onWrapScroll);
});

/** template 变化时实时同步 multi 集合(template 引用本身不变,但 elements 数组会换) */
watch(
  () => allElements(props.template).map((e) => e.id),
  () => {
    const ids = new Set(allElements(props.template).map((e) => e.id));
    if (props.multiSelectedIds) {
      const valid = props.multiSelectedIds.filter((id) => ids.has(id));
      if (valid.length !== props.multiSelectedIds.length) {
        emit("selectMany", valid);
      }
    }
  },
);
</script>

<style scoped>
.canvas-wrap {
  flex: 1;
  background: #ececec;
  /* 新模型:wrap 接管横纵滚动;.main 不再 overflow */
  overflow: auto;
  display: flex;
  align-items: flex-start; /* canvas 顶部 0 跟 wrap 顶部 0 对齐,canvas 0mm 跟 ruler 0 刻度对齐 */
  justify-content: center;
  min-width: 0;
  min-height: 0;
  position: relative; /* 自线 / 吸附线 / guide 浮层 absolute 相对 wrap 定位 */
}
.canvas-wrap.pan-mode {
  cursor: grab;
}
.canvas-wrap.pan-mode:active {
  cursor: grabbing;
}
/* .canvas-pan 单独承接 pan(在 .canvas-scale 之外,不被 scale 二次缩放) */
.canvas-pan {
  position: relative;
  flex-shrink: 0;
  width: fit-content;
}
/* .canvas-scale 根:transform: scale(zoom) 视觉缩放画布,
 * 子节点 (.print-page / .canvas / .canvas-element) 全部用 raw mm→px 数值,
 * 父级 scale 让它们视觉上正确;
 * 多页靠 flex-col + row-gap 自动垂直堆叠(row-gap 用 raw mm→px,父级 scale 视觉一致) */
.canvas-scale {
  display: flex;
  flex-direction: column;
  row-gap: 75.6px; /* = mmToPx(PAGE_SPACING_MM) = mmToPx(20) */
  transform-origin: top left;
}
/* 多页:每个 page 是 .canvas-scale 的 flex 子元素,内部 .canvas 相对 page 0,0 */
.print-page {
  position: relative;
  flex-shrink: 0;
  /* width / height 由 :style 注入 */
}
.ruler {
  position: absolute;
  background: linear-gradient(to bottom, #fbfbfd, #f3f3f6);
  display: block;
  pointer-events: none;
  z-index: 5; /* 在 snap-line 之上,让辅助线延伸到 ruler 位置时 ruler 仍然可见 */
  user-select: none;
}
/* 标尺已搬到 .canvas-frame 内(跟画布走),不再用 viewport 覆盖式 .ruler-overlay */
.ruler-h {
  position: absolute;
  top: 0;
  left: 0;
  height: 32px;
  border-bottom: 1px solid #d8d8de;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.04);
}
.ruler-v {
  position: absolute;
  top: 0;
  left: 0;
  width: 32px;
  border-right: 1px solid #d8d8de;
  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.04);
}
.ruler-corner {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 11;
  border-right: 1px solid #d8d8de;
  border-bottom: 1px solid #d8d8de;
}
.ruler-corner-dot {
  fill: #1890ff;
  filter: drop-shadow(0 0 2px rgba(24, 144, 255, 0.6));
}

/* 刻度线:默认 minor 灰色短, major 更长更深, zero 贯穿整高(加粗) */
.ruler-tick {
  stroke: #b8b8c0;
  stroke-width: 1;
  shape-rendering: crispEdges;
}
.ruler-tick-major {
  stroke: #6a6a72;
  stroke-width: 1;
}
.ruler-tick-zero {
  stroke: #1890ff;
  stroke-width: 1.5;
}

/* 文字 */
.ruler-text {
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  fill: #6a6a72;
  letter-spacing: 0.2px;
  paint-order: stroke;
  stroke: rgba(252, 252, 253, 0.85);
  stroke-width: 2.5;
  stroke-linejoin: round;
}
.ruler-text-zero {
  fill: #1890ff;
  font-weight: 600;
  stroke: rgba(252, 252, 253, 0.9);
}

/* 用户自定义参考线(guide),跨整个 wrap,延伸进 ruler 区域;双击删除 */
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

/* 拖动中延长线围成的范围浅蓝半透明填充(z-index 1,被 self-line 虚线盖住) */
.self-fill {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  background: rgba(24, 144, 255, 0.08);
  transition: opacity 80ms;
}

/* 鼠标游标 */
.ruler-cursor line {
  stroke: #ff4d4f;
  stroke-width: 1;
  shape-rendering: crispEdges;
}
.ruler-cursor rect {
  fill: #ff4d4f;
  filter: drop-shadow(0 1px 2px rgba(255, 77, 79, 0.4));
}
.ruler-cursor text {
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 600;
  fill: #fff;
}
.canvas {
  position: absolute;
  top: 50px; /* 画布 0mm 距 .print-page 顶 50px,留呼吸 */
  left: 0;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.canvas-element {
  position: absolute;
  border: 1px dashed #c0c4cc;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
  /* 默认 visible,让外凸的删除叉子能漏出来 */
  background: transparent;
  transition:
    background 120ms,
    border-color 120ms;
}
.canvas-element.is-image {
  /* image 需要裁剪溢出 */
  overflow: hidden;
}
.canvas-element:hover {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}
.canvas-element.selected {
  border: 1px solid #1890ff;
  background: rgba(24, 144, 255, 0.1);
}
/* 锁定元素:边色变金黄 + 不允许拖动光标 */
.canvas-element.locked {
  border-color: #faad14 !important;
  cursor: not-allowed !important;
}
/* 锁定徽标(元素左上角) */
.lock-badge {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 20px;
  height: 20px;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  background: #faad14;
  color: #fff;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 100;
}
/* 实时旋转角度文本(元素底边中点下方,反向旋转保持正向可读) */
.rotate-deg {
  position: absolute;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: #1890ff;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 101;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
/* 拖动中的延长线(从元素/组 4 边出发,跨整个 .main viewport,延伸到 ruler 区域):浅蓝虚线
   提到 .ruler-overlay 内是为了在 ruler 区域内也能看到浅蓝短截,坐标公式用 canvasOffsetX/Y */
.self-line {
  position: absolute;
  pointer-events: none;
  z-index: 6; /* > ruler(5),在 ruler 区域自线可见 */
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

/* 吸附辅助线:跨整个 .main viewport,在 ruler 区域内也能看到红色短截(表示对齐) */
.snap-line {
  position: absolute;
  background: #ff4d4f;
  pointer-events: none;
  z-index: 7; /* > ruler(5) 和 self-line(6) */
  /* 拖动时显示/隐藏,平滑过渡 */
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

/* ========== Resize / Rotate handles ==========
   角 handle(corner):18x18 框 + 内部 L 形(10x3 横 + 3x10 竖)圆角条
   边 handle(edge):12x3 短条,方向决定横/竖
   旋转 handle:圆点 + 连线
*/
.resize-handle {
  position: absolute;
  pointer-events: auto;
  z-index: 100;
  background: transparent;
}
/* ---------- 角 handle:L 形(横 + 竖) ---------- */
.rh-corner {
  width: 10px;
  height: 10px;
}
.rh-corner::before,
.rh-corner::after {
  content: "";
  position: absolute;
  background: #1890ff;
  border-radius: 1.5px;
  opacity: 0.9;
  transition: opacity 120ms;
}
.rh-corner:hover::before,
.rh-corner:hover::after {
  opacity: 1;
}
/* 横条(顶部或底部) */
.rh-corner::before {
  left: 0;
  width: 10px;
  height: 3px;
}
/* 竖条(左侧或右侧) */
.rh-corner::after {
  top: 0;
  width: 3px;
  height: 10px;
}
/* 角 handle 的 L 角点位置 */
.rh-nw::before {
  top: 0;
}
.rh-nw::after {
  left: 0;
}
.rh-ne::before {
  top: 0;
  right: 0;
  left: auto;
}
.rh-ne::after {
  right: 0;
  top: 0;
}
.rh-se::before {
  bottom: 0;
  top: auto;
}
.rh-se::after {
  right: 0;
  bottom: 0;
  top: auto;
}
.rh-sw::before {
  bottom: 0;
  top: auto;
}
.rh-sw::after {
  left: 0;
  bottom: 0;
  top: auto;
}

/* ---------- 边 handle:单方向短条 ---------- */
.rh-edge {
  background: #1890ff;
  border-radius: 1.5px;
  opacity: 0.85;
  transition:
    opacity 120ms,
    transform 120ms;
}
.rh-edge:hover {
  opacity: 1;
  transform: scale(1.2);
}
/* 上下边:横条 */
.rh-n,
.rh-s {
  width: 14px;
  height: 3px;
}
/* 左右边:竖条 */
.rh-e,
.rh-w {
  width: 3px;
  height: 14px;
}
.rotate-line {
  position: absolute;
  background: #1890ff;
  opacity: 0.75;
  pointer-events: auto;
  z-index: 100;
}
.rotate-handle {
  position: absolute;
  width: 18px;
  height: 18px;
  background: #1890ff;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  cursor: crosshair;
  z-index: 101;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 120ms,
    box-shadow 120ms;
}
.rotate-handle:hover {
  transform: scale(1.15);
  box-shadow:
    0 0 0 3px rgba(24, 144, 255, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

/* ========== 框选 / 多选 ========== */
.marquee-rect {
  position: absolute;
  pointer-events: none;
  z-index: 9998;
  background: rgba(24, 144, 255, 0.08);
  border: 1.5px dashed #1890ff;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.15);
  box-sizing: border-box;
}
.marquee-size {
  position: absolute;
  right: -2px;
  bottom: -28px;
  padding: 2px 8px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 500;
  color: #fff;
  background: #1890ff;
  border-radius: 3px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  user-select: none;
}
/* 多选但非主选:蓝虚线包围(跟单选实线区分) */
.canvas-element.multi-selected {
  border: 1.5px dashed #1890ff !important;
  background: rgba(24, 144, 255, 0.06) !important;
}
/* 框选过程中实时高亮将要选中的元素 */
.canvas-element.marquee-hit {
  border: 1.5px dashed #69c0ff !important;
  background: rgba(24, 144, 255, 0.14) !important;
  transition:
    background 60ms,
    border-color 60ms;
}
</style>
