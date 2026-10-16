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
          <!-- 每页右上角浮动操作按钮组(添加/复制/粘贴/↑/页码/↓),跟随 zoom 反向缩放保持视觉尺寸 -->
          <div class="page-actions" :style="pageActionsStyle">
            <button
              class="pa-btn"
              title="添加页(末尾)"
              @click="emit('pageAdd')"
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </button>
            <button
              class="pa-btn"
              title="复制此页"
              @click="emit('pageCopy', pageIndex)"
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="5" y="5" width="8" height="8" rx="1" />
                <path d="M3 11V4a1 1 0 0 1 1-1h7" />
              </svg>
            </button>
            <button
              class="pa-btn"
              :disabled="pageIndex === 0"
              title="上移一页"
              @click="emit('pageMove', pageIndex, pageIndex - 1)"
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <line x1="8" y1="13" x2="8" y2="3" />
                <polyline points="4,7 8,3 12,7" />
              </svg>
            </button>
            <input
              class="pa-page-no"
              type="number"
              :min="1"
              :max="template.pages.length"
              :value="pageIndex + 1"
              :title="`当前第 ${pageIndex + 1} / ${template.pages.length} 页`"
              @change="onPageNoInput(pageIndex, $event)"
            />
            <button
              class="pa-btn"
              :disabled="pageIndex >= template.pages.length - 1"
              title="下移一页"
              @click="emit('pageMove', pageIndex, pageIndex + 1)"
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <line x1="8" y1="3" x2="8" y2="13" />
                <polyline points="4,9 8,13 12,9" />
              </svg>
            </button>
            <button
              class="pa-btn pa-btn-danger"
              :disabled="pageIndex === 0"
              title="删除此页"
              @click="onPageRemove(pageIndex)"
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <line x1="3" y1="4" x2="13" y2="4" />
                <path
                  d="M5 4V2.5A1.5 1.5 0 0 1 6.5 1h3A1.5 1.5 0 0 1 11 2.5V4"
                />
                <path
                  d="M4 4l1 9.5A1.5 1.5 0 0 0 6.5 15h3a1.5 1.5 0 0 0 1.5-1.5L12 4"
                />
              </svg>
            </button>
          </div>
          <div
            class="canvas"
            :style="canvasStyle"
            :data-page-index="pageIndex"
            @dragover.prevent
            @drop.stop="onDrop"
          >
            <!-- 可印刷区域(页边距内框),置于元素之前,层级 0 让元素自然覆盖 -->
            <div
              v-if="showSafeArea"
              class="safe-area"
              :style="safeAreaStyle"
              aria-hidden="true"
            />
            <!-- 页眉分隔线(距 paper 顶部 headerHeight mm 处一条横线,可拖动) -->
            <div
              v-if="showHeaderLineV"
              class="paper-line"
              :style="headerLineStyle"
              role="separator"
              title="拖动调整页眉线位置"
              @mousedown.stop="onLineMouseDown($event, 'header')"
            >
              <span class="paper-line-label">页眉</span>
            </div>
            <!-- 页脚分隔线(距 paper 底部 footerHeight mm 处一条横线,可拖动) -->
            <div
              v-if="showFooterLineV"
              class="paper-line"
              :style="footerLineStyle"
              role="separator"
              title="拖动调整页脚线位置"
              @mousedown.stop="onLineMouseDown($event, 'footer')"
            >
              <span class="paper-line-label">页脚</span>
            </div>
            <div
              v-for="el in page.elements"
              :key="el.id"
              class="canvas-element"
              :class="{
                selected: el.id === selectedId,
                'is-image': el.type === 'image',
                locked: el.locked,
                'no-print': el.print === false,
                'multi-selected':
                  isMultiSelected(el.id) && el.id !== selectedId,
                'marquee-hit': marqueeHits.has(el.id),
              }"
              :style="elBox(el)"
              @mousedown="onElementMouseDown($event, el.id)"
              @contextmenu.prevent.stop="onContextMenu($event, el.id)"
            >
              <ElementRenderer :element="el" />
              <ElementOverlayHandles
                v-if="el.id === selectedId"
                :element="el"
                @resize-start="onResizeStart"
                @rotate-start="onRotateStart"
              />
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

    <!-- 用户自定义参考线(guides)浮层(由 GuideOverlay 渲染) -->
    <GuideOverlay
      :guides="props.guides ?? []"
      :highlighted-id="props.highlightedGuideId ?? null"
      :get-x="guideXStyle"
      :get-y="guideYStyle"
      @hover="emit('guideHover', $event)"
      @remove="emit('guideRemove', $event)"
    />

    <!-- 拖动中的"延长线 + 选区填充" + 吸附命中红线浮层(由 SnapAndSelfLinesOverlay 渲染) -->
    <SnapAndSelfLinesOverlay
      :self-lines="selfLinesOverlay"
      :snap-lines="snapLinesOverlay"
      :self-fill-style="selfFillStyle"
      :wrap-scroll-top="wrapScrollTop"
      :wrap-scroll-left="wrapScrollLeft"
    />

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

    <!-- 删除页二次确认弹窗 -->
    <Modal
      v-model:open="removePageConfirm.open"
      title="删除页"
      :content="`确定删除第 ${(removePageConfirm.pageIndex ?? 0) + 1} 页?`"
      confirm-text="删除"
      cancel-text="取消"
      :show-cancel="true"
      danger
      @confirm="onRemovePageConfirm"
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
import { mmToPx, estimateTextHeight } from "../../core/render";
import { allElements, findElementGlobal } from "../../core/schema";
import { useCanvasDrag } from "../../composables/useCanvasDrag";
import ElementRenderer from "../elements/ElementRenderer.vue";
import ContextMenu from "../floating/ContextMenu.vue";
import Modal from "../floating/Modal.vue";
import ElementOverlayHandles from "./ElementOverlayHandles.vue";
import SnapAndSelfLinesOverlay, {
  type OverlayLine,
} from "./SnapAndSelfLinesOverlay.vue";
import GuideOverlay from "./GuideOverlay.vue";

/** 多页之间的纵向间距(mm)。 */
const PAGE_SPACING_MM = 10;

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
  /** 画布背景色(#rrggbb / transparent) */
  canvasBackground?: string;
  /** 水平页面边距(mm),在 .canvas 内画一个虚线内框表示可印刷区域 */
  pageMarginHorizontal?: number;
  /** 垂直页面边距(mm) */
  pageMarginVertical?: number;
  /** 页眉线距离画布顶部的距离(mm) */
  headerHeight?: number;
  /** 是否显示页眉分隔线 */
  showHeaderLine?: boolean;
  /** 页眉线颜色 */
  headerLineColor?: string;
  /** 页眉线宽度(mm) */
  headerLineWidth?: number;
  /** 页眉线样式 */
  headerLineStyle?: "solid" | "dashed" | "dotted";
  /** 页眉线水平跨度 */
  headerLineSpan?: number;
  /** 页眉线跨度单位 */
  headerLineSpanMode?: "value" | "percent";
  /** 页脚线距离画布底部的距离(mm) */
  footerHeight?: number;
  /** 是否显示页脚分隔线 */
  showFooterLine?: boolean;
  /** 页脚线颜色 */
  footerLineColor?: string;
  /** 页脚线宽度(mm) */
  footerLineWidth?: number;
  /** 页脚线样式 */
  footerLineStyle?: "solid" | "dashed" | "dotted";
  /** 页脚线水平跨度 */
  footerLineSpan?: number;
  /** 页脚线跨度单位 */
  footerLineSpanMode?: "value" | "percent";
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
  add: [
    type: ElementType,
    pageIndex?: number,
    position?: { x: number; y: number },
  ];
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
  /** 拖动页眉分隔线改变位置(mm) */
  changeHeaderHeight: [mm: number];
  /** 拖动页脚分隔线改变位置(mm) */
  changeFooterHeight: [mm: number];
  /** ctrl/cmd + 滚轮触发缩放,父级走 designer.setZoom */
  setZoom: [z: number];
  /** 每页卡片右上角浮动按钮组(按源 Vue-Print-Designer Canvas.vue 仿) */
  pageAdd: [];
  pageCopy: [pageIndex: number];
  pageMove: [from: number, to: number];
  pageRemove: [pageIndex: number];
}>();

// 吸附阈值(单位:mm,4px / 3.78 ≈ 1mm,这里取 1mm 适中)
const SNAP_THRESHOLD_MM = 1;

/** 标尺宽度(px):同时给画布 left/top 让位、所有 frame 级辅助线偏移用 */
const RULER_SIZE = 32;

const zoomValue = computed(() => props.zoom ?? 1);

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
  backgroundColor: props.canvasBackground || "#ffffff",
  backgroundImage: gridStyle.value.image,
  backgroundSize: gridStyle.value.size || undefined,
}));

/** 每页右上角浮动按钮组:反向 zoom 缩放保持视觉尺寸恒定(跟源 Vue-Print-Designer 一致) */
const pageActionsStyle = computed(() => ({
  transform: `scale(${1 / zoomValue.value})`,
  transformOrigin: "top right",
}));

/** 可印刷区域框:水平/垂直边距都 > 0 才显示 */
const safeAreaStyle = computed(() => {
  const h = props.pageMarginHorizontal ?? 0;
  const v = props.pageMarginVertical ?? 0;
  return {
    left: mmToPx(h) + "px",
    top: mmToPx(v) + "px",
    right: mmToPx(h) + "px",
    bottom: mmToPx(v) + "px",
  };
});
const showSafeArea = computed(
  () =>
    (props.pageMarginHorizontal ?? 0) > 0 ||
    (props.pageMarginVertical ?? 0) > 0,
);

/** 页眉 / 页脚分隔线:headerHeight = 距顶部偏移,footerHeight = 距底部偏移。
 * 渲染为带颜色/宽度/样式的水平线段,span 控制水平长度(value mm 或 percent)。
 * height:0 + padding 6px 0 撑出 hit area,border-top 在 padding-box 顶部,
 * 线视觉正好等于 top/bottom 偏移值(header 贴顶,footer 贴底)。 */
function lineStyle(
  offsetMm: number,
  lineWidthMm: number,
  lineColor: string | undefined,
  lineStyleStr: "solid" | "dashed" | "dotted" | undefined,
  spanValue: number | undefined,
  spanMode: "value" | "percent" | undefined,
  edge: "top" | "bottom",
) {
  const paperW = props.template.paper.width;
  const span = spanValue ?? 100;
  const widthMm = spanMode === "percent" ? (paperW * span) / 100 : span;
  const lwPx = Math.max(mmToPx(lineWidthMm), 1);
  return {
    [edge]: mmToPx(offsetMm) + "px",
    left: "0",
    width: mmToPx(widthMm) + "px",
    height: "0",
    borderTop: `${lwPx}px ${lineStyleStr || "dashed"} ${lineColor || "#f87171"}`,
  };
}

const headerLineStyle = computed(() =>
  lineStyle(
    props.headerHeight ?? 0,
    props.headerLineWidth ?? 1,
    props.headerLineColor,
    props.headerLineStyle,
    props.headerLineSpan,
    props.headerLineSpanMode,
    "top",
  ),
);
const showHeaderLineV = computed(() => props.showHeaderLine === true);

const footerLineStyle = computed(() =>
  lineStyle(
    props.footerHeight ?? 0,
    props.footerLineWidth ?? 1,
    props.footerLineColor,
    props.footerLineStyle,
    props.footerLineSpan,
    props.footerLineSpanMode,
    "bottom",
  ),
);
const showFooterLineV = computed(() => props.showFooterLine === true);

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
/** wrap 滚动距离:self-v / self-h 用它修正 top/bottom/left/right,
 *  让延长线在 wrap 可视区内跨满(否则 wrap scrollTop > 0 时 self-v 顶部被滚出可视区) */
const wrapScrollTop = ref(0);
const wrapScrollLeft = ref(0);
function measureWrap() {
  const w = wrapRef.value;
  if (!w) return;
  wrapSize.value = { w: w.clientWidth, h: w.clientHeight };
  wrapScrollTop.value = w.scrollTop;
  wrapScrollLeft.value = w.scrollLeft;
  // 通知父级重算 ruler offset(wrap size 变化,canvas 居中位置变)
  emit("viewportChange");
}
function onWrapScroll() {
  if (!wrapRef.value) return;
  wrapScrollTop.value = wrapRef.value.scrollTop;
  wrapScrollLeft.value = wrapRef.value.scrollLeft;
  // wrap 滚动改变 canvas 视觉位置,触发 ruler 重算
  emit("viewportChange");
}

/** Ctrl/Cmd + 滚轮:画布缩放(pan-mode 留给原生滚动,避免冲突)。
 *  deltaY > 0 缩小,< 0 放大;每次 0.1 步进,保持跟 HeaderToolbar +/- 一致。 */
function onWheel(e: WheelEvent) {
  if (props.panMode) return;
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  const step = e.deltaY > 0 ? -0.1 : 0.1;
  emit("setZoom", (props.zoom ?? 1) + step);
}

/** 页眉/页脚分隔线拖动:鼠标 clientY 变化 → new offset(mm,zoom 修正)。
 * mousedown.stop 阻断冒泡,不让 wrap mousedown 进入 marquee 路径。 */
function onLineMouseDown(e: MouseEvent, edge: "header" | "footer") {
  e.preventDefault();
  const initialClientY = e.clientY;
  const initialMm =
    edge === "header" ? (props.headerHeight ?? 0) : (props.footerHeight ?? 0);
  const zoom = zoomValue.value;
  const PX_PER_MM = 96 / 25.4;

  function onMove(ev: MouseEvent) {
    const dyPx = (ev.clientY - initialClientY) / zoom;
    // header: 距顶,鼠标下移 → 增大;footer: 距底,鼠标上移 → 增大,方向相反
    const next =
      edge === "header"
        ? Math.max(0, initialMm + dyPx / PX_PER_MM)
        : Math.max(0, initialMm - dyPx / PX_PER_MM);
    if (edge === "header") emit("changeHeaderHeight", next);
    else emit("changeFooterHeight", next);
  }
  function onUp() {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

onMounted(() => {
  measureWrap();
  if (wrapRef.value && "ResizeObserver" in window) {
    new ResizeObserver(measureWrap).observe(wrapRef.value);
  }
  if (wrapRef.value) {
    wrapRef.value.addEventListener("scroll", onWrapScroll, { passive: true });
    wrapRef.value.addEventListener("wheel", onWheel, { passive: false });
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
/** mm 位置 → overlay 屏幕 px。
 *  pageOffsetMm(默认 0)用于把 page-local mm 加成"全局 mm",仅 h 方向需要,
 *  v 方向多页堆叠不变;调用方按 selfLines.pageOffsetMm 传入。 */
function overlayY(valMm: number, pageOffsetMm: number = 0): number {
  return (
    CANVAS_TOP_GAP +
    offsetY.value +
    mmToPx(valMm + pageOffsetMm) * zoomValue.value +
    (props.panY ?? 0)
  );
}

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

/** 当前选中元素(handle 层需要) */
const selectedEl = computed<Element | null>(() => {
  if (!props.selectedId) return null;
  return findElementGlobal(props.template, props.selectedId)?.el ?? null;
});

// ========== 标尺:鼠标游标 + 选中元素位置标记 ==========

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
  let h = el.h;
  if (el.type === "text" && el.autoHeight) {
    const displayText =
      el.title && el.showTitle !== false ? `${el.title}: ${el.text}` : el.text;
    h = Math.max(
      el.h,
      estimateTextHeight(displayText, el.w, el.fontSize, el.lineHeight ?? 1.2),
    );
  }
  return {
    left: mmToPx(el.x) + "px",
    top: mmToPx(el.y) + "px",
    width: mmToPx(el.w) + "px",
    height: mmToPx(h) + "px",
    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
    transformOrigin: "center",
  };
}

/** 页码输入框:输入目标序号(1-based)→ emit pageMove(from, to-1) */
function onPageNoInput(fromIndex: number, ev: Event) {
  const target = ev.target as HTMLInputElement;
  const order = Number.parseInt(target.value, 10);
  if (!Number.isFinite(order)) return;
  const total = props.template.pages.length;
  const toIndex = Math.max(0, Math.min(total - 1, order - 1));
  if (toIndex === fromIndex) return;
  emit("pageMove", fromIndex, toIndex);
}

/** 删除页:打开确认弹窗,用户点确认后才 emit pageRemove(idx);useDesigner 那边会清 selectedId */
const removePageConfirm = ref<{ open: boolean; pageIndex: number | null }>({
  open: false,
  pageIndex: null,
});
function onPageRemove(pageIndex: number) {
  if (pageIndex === 0) return;
  removePageConfirm.value = { open: true, pageIndex };
}
function onRemovePageConfirm() {
  if (removePageConfirm.value.pageIndex != null) {
    emit("pageRemove", removePageConfirm.value.pageIndex);
  }
  removePageConfirm.value = { open: false, pageIndex: null };
}

function onDrop(e: DragEvent) {
  const type = e.dataTransfer?.getData("text/plain") as ElementType;
  if (!type) return;
  // 从 .canvas 的 data-page-index 读出"鼠标在哪个 page 上"(currentTarget = .canvas)
  const canvas = (e.currentTarget as HTMLElement).classList.contains("canvas")
    ? (e.currentTarget as HTMLElement)
    : ((e.currentTarget as HTMLElement).querySelector(
        ".canvas",
      ) as HTMLElement | null);
  const pageIndexAttr = (e.currentTarget as HTMLElement).dataset.pageIndex;
  const pageIndex = pageIndexAttr != null ? Number(pageIndexAttr) : 0;
  if (!canvas) {
    emit("add", type, pageIndex);
    return;
  }
  const cr = canvas.getBoundingClientRect();
  const localX = e.clientX - cr.left;
  const localY = e.clientY - cr.top;
  if (localX < 0 || localY < 0) {
    emit("add", type, pageIndex);
    return;
  }
  const z = zoomValue.value;
  const x = localX / (mmToPx(1) * z);
  const y = localY / (mmToPx(1) * z);
  emit("add", type, pageIndex, { x, y });
}

function onWrapDragOver(e: DragEvent) {
  // 仅占位,模板上 .prevent 已让 drop 生效
  void e;
}

// ========== Context Menu ==========

const ctxMenu = reactive<{
  open: boolean;
  pos: { x: number; y: number };
  /** 仅记录"是不是在元素上右键打开的菜单";具体 element 用 computedMenuEl 实时查 */
  onElement: boolean;
}>({ open: false, pos: { x: 0, y: 0 }, onElement: false });

function closeCtxMenu() {
  ctxMenu.open = false;
  ctxMenu.onElement = false;
}

// ========== 拖动 / 框选 / Resize / Rotate ==========
// 全部交给 useCanvasDrag composable,父级只透传 props 和事件 emit
const {
  marquee,
  marqueeHits,
  marqueeStarting,
  selfLines,
  snapLines,
  marqueeStyle,
  isMultiSelected,
  onWrapMouseDown,
  onElementMouseDown,
  onResizeStart,
  onRotateStart,
} = useCanvasDrag({
  template: () => props.template,
  getSelectedId: () => props.selectedId,
  getMultiSelectedIds: () => props.multiSelectedIds ?? [],
  getPanMode: () => props.panMode ?? false,
  getZoom: () => props.zoom ?? 1,
  getPanX: () => props.panX ?? 0,
  getPanY: () => props.panY ?? 0,
  isCtxMenuOpen: () => ctxMenu.open,
  onCloseCtx: closeCtxMenu,
  onSelect: (id) => emit("select", id),
  onSelectMany: (ids) => emit("selectMany", ids),
  onSelectToggle: (id) => emit("selectToggle", id),
  onMove: (id, x, y) => emit("move", id, x, y),
  onMoveMany: (updates) => emit("moveMany", updates),
  onResize: (id, patch) => emit("resize", id, patch),
  onRotate: (id, deg) => emit("rotate", id, deg),
  onPan: (dx, dy) => emit("pan", dx, dy),
});

/** 框选 mm chip 显示:保留 1 位小数 */
function formatMm(mm: number): string {
  return mm.toFixed(1).replace(/\.0$/, "");
}

/** 把 selfLines (mm 数组) 转成 SnapAndSelfLinesOverlay 需要的 OverlayLine 数组(mm + px) */
const selfLinesOverlay = computed<{
  v: OverlayLine[];
  h: OverlayLine[];
} | null>(() => {
  if (!selfLines.value) return null;
  const pageOffsetMm = selfLines.value.pageOffsetMm ?? 0;
  return {
    v: selfLines.value.v.map((mm, i) => ({ id: i, mm, px: overlayX(mm) })),
    h: selfLines.value.h.map((mm, i) => ({
      id: i,
      mm,
      px: overlayY(mm, pageOffsetMm),
    })),
  };
});

/** 把 snapLines (mm 数组) 转成 OverlayLine 数组。
 *  horizontal 跟 selfLines 共享同一 pageOffsetMm(同一 drag 周期内,
 *  snap 候选收集使用 page-local mm,但渲染位置需对齐元素所在 page) */
const snapLinesOverlay = computed<{
  vertical: OverlayLine[];
  horizontal: OverlayLine[];
}>(() => ({
  vertical: snapLines.vertical.map((mm, i) => ({
    id: i,
    mm,
    px: overlayX(mm),
  })),
  horizontal: snapLines.horizontal.map((mm, i) => ({
    id: i,
    mm,
    px: overlayY(mm, selfLines.value?.pageOffsetMm ?? 0),
  })),
}));

/** 拖动中延长线围成的矩形(选区浅蓝填充),从 selfLines 算出 */
const selfFillStyle = computed(() => {
  const sl = selfLines.value;
  if (!sl) return {};
  const x1 = Math.min(...sl.v);
  const x2 = Math.max(...sl.v);
  const y1 = Math.min(...sl.h);
  const y2 = Math.max(...sl.h);
  const pageOffsetMm = sl.pageOffsetMm ?? 0;
  return {
    left: overlayX(x1) + "px",
    top: overlayY(y1, pageOffsetMm) + "px",
    width: mmToPx(x2 - x1) * zoomValue.value + "px",
    height: mmToPx(y2 - y1) * zoomValue.value + "px",
  };
});

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
  if (wrapRef.value) {
    wrapRef.value.removeEventListener("scroll", onWrapScroll);
    wrapRef.value.removeEventListener("wheel", onWheel);
  }
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
  padding: 50px;
}
.canvas-wrap.pan-mode {
  cursor: grab;
  /* pan 模式(空格 / 手型按钮)用拖动代替滚动:禁用 wrap 自身 overflow,
   * 否则浏览器会把 mousedown 后的 mousemove 路由给 wrap 的滚动条,
   * 事件不冒泡到 document,useCanvasDrag 的 onMove 不触发,pan 失效 */
  overflow: hidden;
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
  row-gap: 37.8px; /* = mmToPx(PAGE_SPACING_MM) = mmToPx(10) */
  transform-origin: top left;
}
/* 多页:每个 page 是 .canvas-scale 的 flex 子元素,内部 .canvas 相对 page 0,0 */
.print-page {
  position: relative;
  flex-shrink: 0;
  /* width / height 由 :style 注入 */
}
/* 每页右上角浮动操作按钮组:竖排,贴在画布右上外侧(画布顶边线上、右侧外);反向 zoom 缩放保持视觉尺寸恒定 */
.page-actions {
  position: absolute;
  top: 0;
  right: -36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  z-index: 6;
  /* 跟元素选中样式保持一致的字号,12px 视觉尺寸下紧凑 */
  font-size: 12px;
}
.pa-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: #555;
  cursor: pointer;
}
.pa-btn:hover:not(:disabled) {
  background: #e6f4ff;
  color: #1677ff;
}
.pa-btn-danger:hover:not(:disabled) {
  background: #fff1f0;
  color: #ff4d4f;
}
.pa-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.pa-page-no {
  width: 24px;
  height: 22px;
  padding: 0 2px;
  text-align: center;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  font-size: 11px;
  color: #333;
  background: #fafafa;
  -moz-appearance: textfield;
}
.pa-page-no::-webkit-outer-spin-button,
.pa-page-no::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 拖动中延长线围成的范围浅蓝半透明填充已搬到 SnapAndSelfLinesOverlay.vue */
.canvas {
  position: absolute;
  top: 0;
  left: 0;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
/* 可印刷区域框:水平/垂直边距界定的内框,虚线浅蓝,元素自然覆盖 */
.safe-area {
  position: absolute;
  pointer-events: none;
  border: 1px dashed #91caff;
  box-sizing: border-box;
}

.paper-line {
  position: absolute;
  cursor: ns-resize;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
/* 线右端文字标签:flex 自动贴右边、padding-box 内垂直居中,
 * pointer-events:none 避免拦截拖动 */
.paper-line-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: #f87171;
  padding-right: 4px;
  white-space: nowrap;
  pointer-events: none;
  /* 上挪一点,避免压在线视觉上;header 在线之上,footer 在 paper 内、line 之上 */
  transform: translateY(-10px);
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
/* 不打印元素:2px 灰色虚线 + 半透灰底,跟默认 1px 浅灰、selected/hover 蓝边 都区分开 */
.canvas-element.no-print {
  border: 2px dashed #8c8c8c !important;
  background: rgba(140, 140, 140, 0.06) !important;
}

/* ========== Resize / Rotate handles 已搬到 ElementOverlayHandles.vue ========== */
/* ========== 延长线 / 吸附线 / mm chip 已搬到 SnapAndSelfLinesOverlay.vue ========== */

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
