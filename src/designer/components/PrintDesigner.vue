<template>
  <div ref="rootRef" class="print-designer">
    <TopBar
      :dirty="designer.dirty.value"
      @save="onSave"
      @save-as="onSaveAs"
      @preview="onPreview"
      @print="onPrint"
      @export-pdf="onExportPdf"
      @export-html="onExportHtml"
      @export-images="onExportImages"
      @toolbar-reorder="onToolbarReorder"
      @help="onHelp"
      @settings="onSettings"
    />
    <HeaderToolbar
      :can-undo="designer.canUndo.value"
      :can-redo="designer.canRedo.value"
      :show-grid="designer.showGrid.value"
      :has-selection="!!designer.selectedId.value"
      :locked="!!designer.selected.value?.locked"
      :multi-count="designer.multiSelectedIds.value.length"
      :is-text="isText"
      :font-size="currentFontSize"
      :font-family="currentFontFamily"
      :text-color="currentTextColor"
      :bg-color="currentBgColor"
      :bold-active="boldActive"
      :italic-active="italicActive"
      :underline-active="underlineActive"
      :strike-active="strikeActive"
      :writing-mode-active="writingModeActive"
      :paper-width="designer.template.value.paper.width"
      :paper-height="designer.template.value.paper.height"
      :canvas-background="designer.canvasBackground.value"
      :page-margin-horizontal="designer.pageMarginHorizontal.value"
      :page-margin-vertical="designer.pageMarginVertical.value"
      :allow-drag-outside-canvas="designer.allowDragOutsideCanvas.value"
      :header-line-color="designer.headerLineColor.value"
      :header-line-width="designer.headerLineWidth.value"
      :header-line-style="designer.headerLineStyle.value"
      :header-line-span="designer.headerLineSpan.value"
      :header-line-span-mode="designer.headerLineSpanMode.value"
      :header-height="designer.headerHeight.value"
      :show-header-line="designer.showHeaderLine.value"
      :footer-line-color="designer.footerLineColor.value"
      :footer-line-width="designer.footerLineWidth.value"
      :footer-line-style="designer.footerLineStyle.value"
      :footer-line-span="designer.footerLineSpan.value"
      :footer-line-span-mode="designer.footerLineSpanMode.value"
      :footer-height="designer.footerHeight.value"
      :show-footer-line="designer.showFooterLine.value"
      :zoom="designer.zoom.value"
      :pan-mode="panModeActive"
      :theme="theme"
      :has-clipboard="designer.hasClipboard.value"
      :left-panel-open="leftPanelOpen"
      :property-panel-open="propertyPanelOpen"
      @undo="designer.undo"
      @redo="designer.redo"
      @toggle-grid="designer.toggleGrid"
      @toggle-theme="onToggleTheme"
      @toggle-pan="onTogglePan"
      @toggle-lock="designer.toggleLock"
      @toggle-left-panel="onToggleLeftPanel"
      @toggle-property-panel="onTogglePropertyPanel"
      @select-all="designer.selectAllElements"
      @cut="onCutElement"
      @copy="onCopyElement"
      @paste="onPasteElement"
      @delete="designer.deleteSelection"
      @align="onAlignAll"
      @match-size="designer.matchSelectedElementsSize"
      @distribute="designer.distributeSelectedElements"
      @layer="onLayerMove"
      @font-size-step="onFontSizeStep"
      @font-family="onFontFamily"
      @on-text-color="onTextColor"
      @on-bg-color="onBgColor"
      @toggle-bold="onToggleBold"
      @toggle-italic="onToggleItalic"
      @toggle-underline="onToggleUnderline"
      @toggle-strike="onToggleStrike"
      @toggle-writing-mode="onToggleWritingMode"
      @clear-format="onClearFormat"
      @reset-rotation="onResetRotation"
      @set-paper="onSetPaper"
      @set-canvas-background="onSetCanvasBackground"
      @set-page-margin-horizontal="(mm) => designer.setPageMarginHorizontal(mm)"
      @set-page-margin-vertical="(mm) => designer.setPageMarginVertical(mm)"
      @set-allow-drag-outside-canvas="
        (b) => designer.setAllowDragOutsideCanvas(b)
      "
      @set-header-line-color="(c) => designer.setHeaderLineColor(c)"
      @set-header-line-width="(mm) => designer.setHeaderLineWidth(mm)"
      @set-header-line-style="(s) => designer.setHeaderLineStyle(s)"
      @set-header-line-span="(v) => designer.setHeaderLineSpan(v)"
      @set-header-line-span-mode="(m) => designer.setHeaderLineSpanMode(m)"
      @set-header-height="(mm) => designer.setHeaderHeight(mm)"
      @toggle-show-header-line="designer.toggleShowHeaderLine"
      @set-footer-line-color="(c) => designer.setFooterLineColor(c)"
      @set-footer-line-width="(mm) => designer.setFooterLineWidth(mm)"
      @set-footer-line-style="(s) => designer.setFooterLineStyle(s)"
      @set-footer-line-span="(v) => designer.setFooterLineSpan(v)"
      @set-footer-line-span-mode="(m) => designer.setFooterLineSpanMode(m)"
      @set-footer-height="(mm) => designer.setFooterHeight(mm)"
      @toggle-show-footer-line="designer.toggleShowFooterLine"
      @open-header-footer-line-advanced="onOpenHeaderFooterLineAdvanced"
      @set-zoom="onSetZoom"
      @reset-zoom="onResetZoom"
      @export-pdf="onExportPdf"
      @export-html="onExportHtml"
      @export-images="onExportImages"
      @preview="onPreview"
      @print="onPrint"
      @help="onHelp"
      @settings="onSettings"
    />
    <div class="body" ref="bodyRef" :class="{ 'left-closed': !leftPanelOpen }">
      <div class="main" ref="mainRef">
        <!-- 顶部水平 Ruler(浮在 .main 顶 50,匹配 .canvas-pan padding-top,让 ruler 0 = 画布 0mm 屏幕) -->
        <div class="ruler-slot ruler-slot-h">
          <Ruler
            type="horizontal"
            :zoom="designer.zoom.value"
            :scroll="0"
            :offset="rulerOffsetX"
            :indicators="rulerIndicatorsH"
            :range="rulerRangeH"
            :position-labels="rulerLabelsH"
            :unit="unit"
            :dark-mode="darkMode"
            @guide-drag-start="(e) => onGuideDragStart(e, 'horizontal')"
          />
        </div>
        <!-- 左侧垂直 Ruler(浮在 .main 左 0,跟 ruler-h 同 0 屏幕位置) -->
        <div class="ruler-slot ruler-slot-v">
          <Ruler
            type="vertical"
            :zoom="designer.zoom.value"
            :scroll="0"
            :offset="rulerOffsetY"
            :indicators="rulerIndicatorsV"
            :range="rulerRangeV"
            :position-labels="rulerLabelsV"
            :unit="unit"
            :dark-mode="darkMode"
            @guide-drag-start="(e) => onGuideDragStart(e, 'vertical')"
          />
        </div>
        <!-- 角落 32x32 干净小方块,盖住 ruler-h/ruler-v 交汇处的双重刻度,保持 L 形边框连续 -->
        <div class="ruler-corner" :class="{ dark: darkMode }" />
        <!-- 左侧元素面板(浮层,默认展开,紧贴左/上标尺右侧) -->
        <ElementsPanel
          :open="leftPanelOpen"
          @add="onAdd"
          @toggle-panel="onToggleLeftPanel"
        />
        <DesignerCanvas
          :template="designer.template.value"
          :selected-id="designer.selectedId.value"
          :multi-selected-ids="designer.multiSelectedIds.value"
          :zoom="designer.zoom.value"
          :show-grid="designer.showGrid.value"
          :pan-mode="panModeActive"
          :pan-x="panOffset.x"
          :pan-y="panOffset.y"
          :has-clipboard="designer.hasClipboard.value"
          :can-undo="designer.canUndo.value"
          :can-redo="designer.canRedo.value"
          :dark-mode="darkMode"
          :canvas-background="designer.canvasBackground.value"
          :page-margin-horizontal="designer.pageMarginHorizontal.value"
          :page-margin-vertical="designer.pageMarginVertical.value"
          :header-height="designer.headerHeight.value"
          :show-header-line="designer.showHeaderLine.value"
          :header-line-color="designer.headerLineColor.value"
          :header-line-width="designer.headerLineWidth.value"
          :header-line-style="designer.headerLineStyle.value"
          :header-line-span="designer.headerLineSpan.value"
          :header-line-span-mode="designer.headerLineSpanMode.value"
          :footer-height="designer.footerHeight.value"
          :show-footer-line="designer.showFooterLine.value"
          :footer-line-color="designer.footerLineColor.value"
          :footer-line-width="designer.footerLineWidth.value"
          :footer-line-style="designer.footerLineStyle.value"
          :footer-line-span="designer.footerLineSpan.value"
          :footer-line-span-mode="designer.footerLineSpanMode.value"
          :guides="designer.guides.value"
          :highlighted-guide-id="designer.highlightedGuideId.value"
          @add="onAdd"
          @select="designer.select"
          @select-many="onSelectMany"
          @select-toggle="designer.toggleInMulti"
          @move="onMove"
          @move-many="designer.moveMany"
          @resize="onResize"
          @rotate="onRotate"
          @remove="onRemove"
          @remove-many="designer.removeMany"
          @pan="onCanvasPan"
          @ctx-action="onCtxAction"
          @guide-hover="designer.setHighlightedGuide"
          @guide-remove="designer.removeGuide"
          @viewport-change="measureRulerOffsets"
          @change-header-height="(mm) => designer.setHeaderHeight(mm)"
          @change-footer-height="(mm) => designer.setFooterHeight(mm)"
          @set-zoom="onSetZoom"
          @page-add="designer.addPage"
          @page-copy="(i) => designer.copyPage(i)"
          @page-move="(from, to) => designer.movePage(from, to)"
          @page-remove="(i) => designer.removePage(i)"
        />
      </div>
      <PropertyPanel
        :open="propertyPanelOpen"
        :element="designer.selected.value"
        @update="onUpdate"
      />
    </div>

    <!-- 底部状态栏 -->
    <StatusBar
      :selected="designer.selected.value"
      :multi-count="designer.multiSelectedIds.value.length"
      :zoom="designer.zoom.value"
    />

    <!-- 选中文本元素时浮在元素上方的快捷工具条 -->
    <TextQuickToolbar
      :element="selectedText"
      :disabled="!!designer.selected.value?.locked"
      @patch="onTextPatch"
    />

    <!-- 打印预览弹窗 -->
    <PreviewModal
      v-model:visible="previewVisible"
      :html-content="previewHtml"
      :width="previewWidth"
      @print="onPrint"
      @export-pdf="onExportPdf"
      @export-images="onExportImages"
      @export-html="onExportHtml"
    />

    <!-- 查看 JSON 弹窗 -->
    <div
      v-if="jsonModalOpen"
      class="json-modal-mask"
      @click.self="jsonModalOpen = false"
    >
      <div class="json-modal">
        <div class="json-modal-header">
          <span>当前模板 JSON</span>
          <button class="json-modal-close" @click="jsonModalOpen = false">
            ×
          </button>
        </div>
        <pre class="json-modal-body">{{ jsonText }}</pre>
        <div class="json-modal-footer">
          <button class="json-copy-btn" @click="onCopyJson">复制</button>
        </div>
      </div>
    </div>

    <!-- 隐藏的 JSON 文件选择 input -->
    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      style="display: none"
      @change="onImportFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
} from "vue";
import type {
  Element,
  ElementType,
  Template,
  TextElement,
} from "../core/types";
import { useDesigner } from "../api/useDesigner";
import { createTemplate, findElementGlobal } from "../core/schema";
import { printTemplate } from "../utils/print";
import { renderInner } from "../core/render";
import { exportHtml, exportImage, exportPdf } from "../utils/export";
import TopBar from "./layout/TopBar.vue";
import HeaderToolbar from "./layout/HeaderToolbar.vue";
import DesignerCanvas from "./canvas/DesignerCanvas.vue";
import PropertyPanel from "./layout/PropertyPanel.vue";
import Ruler from "./layout/Ruler.vue";
import ElementsPanel from "./layout/ElementsPanel.vue";
import StatusBar from "./layout/StatusBar.vue";
import TextQuickToolbar from "./floating/TextQuickToolbar.vue";
import PreviewModal from "./layout/PreviewModal.vue";

const props = defineProps<{
  initialTemplate?: Template;
  /** 打印时传入的渲染数据(表格 dataPath 会从这里取) */
  printData?: unknown;
}>();

const emit = defineEmits<{
  /** designer.loadJson 失败 */
  jsonImportError: [raw: string];
  /** 打印失败 */
  printError: [];
  /** 打印成功 */
  printOk: [];
  /** 保存按钮被点(由消费方决定写到哪里) */
  save: [tpl: Template];
  /** 用户提示消费方 */
  notice: [message: string, type: "info" | "success" | "warning" | "error"];
}>();

const designer = useDesigner({ template: props.initialTemplate });

// designer root(provide 给 TextQuickToolbar teleport 目标)
const rootRef = ref<HTMLElement | null>(null);
provide("designer-root", rootRef);

// 画布拖动模式(手型 / 空格键)
const panOffset = ref({ x: 0, y: 0 });

/** 空格键临时切换 panMode(松开恢复),不影响 toggle 后的状态 */
const spaceHeld = ref(false);
const togglePan = ref(false); // 用户通过手型按钮切到的状态

const panModeActive = computed(() => togglePan.value || spaceHeld.value);

/** 左侧元素面板开/关(S4 由 ElementsPanel 自身按钮切换) */
const leftPanelOpen = ref(true);
function onToggleLeftPanel() {
  leftPanelOpen.value = !leftPanelOpen.value;
}

/** 右侧属性面板开/关(HeaderToolbar panel 按钮可以触发) */
const propertyPanelOpen = ref(true);
function onTogglePropertyPanel() {
  propertyPanelOpen.value = !propertyPanelOpen.value;
}

/** 打印预览弹窗 */
const previewVisible = ref(false);
const previewHtml = ref("");
/** 预览内容区宽度(px,paper 宽度 mm * 96/25.4 * 当前 zoom) */
const previewWidth = computed(() => {
  const tpl = designer.template.value;
  return Math.round((96 / 25.4) * tpl.paper.width * designer.zoom.value);
});

/** 显示单位 + dark mode(S3 接入) */
const unit = ref<"mm" | "px" | "pt" | "in" | "cm">("mm");
const darkMode = ref(false);

/** 从 ruler 区域按下:转 mm 坐标 + 调 store.addGuide */
function onGuideDragStart(e: MouseEvent, axis: "horizontal" | "vertical") {
  // 从 ruler 自身 rect 算鼠标相对 ruler 0 位置(px),再除以视觉 pxPerMm → mm
  const ruler = e.currentTarget as HTMLElement | null;
  if (!ruler) return;
  const rect = ruler.getBoundingClientRect();
  const pxPerMm = (96 / 25.4) * designer.zoom.value;
  let positionMm: number;
  if (axis === "horizontal") {
    positionMm = (e.clientY - rect.top) / pxPerMm;
  } else {
    positionMm = (e.clientX - rect.left) / pxPerMm;
  }
  designer.addGuide(axis, Math.max(0, positionMm));
}

// ========== Ruler 用的 offset / indicators / range ==========
// 新模型:.canvas 视觉位置(已含 scale + pan + 滚)→ rulerOffsetX 动态重算,ruler 公式简化为 pos = offset + valUnit*unitPx
const mainRef = ref<HTMLElement | null>(null);
const bodyRef = ref<HTMLElement | null>(null);

const rulerOffsetX = ref(0); // canvas 0mm 在 ruler 局部(屏幕)px
const rulerOffsetY = ref(0);

function measureRulerOffsets() {
  const main = mainRef.value;
  if (!main) return;
  const canvas = main.querySelector(".canvas") as HTMLElement | null;
  if (!canvas) return;
  const cr = canvas.getBoundingClientRect();
  const mr = main.getBoundingClientRect();
  // ruler 浮层在 .main 内 top:0(紧贴 .main 顶 0)
  // ruler 0 数字 baseline 屏幕 y = mr.top + 10,画布 0mm 屏幕 y = mr.top + 50
  // ruler 0 数字视觉顶 屏幕 y = mr.top(文字 baseline 10,顶 0)
  // 画布 0mm 屏幕 y 跟 ruler 0 数字视觉顶 差 50(.canvas top:50)
  rulerOffsetX.value = cr.left - mr.left;
  rulerOffsetY.value = cr.top - mr.top;
}

let rulerResizeObserver: ResizeObserver | null = null;
onMounted(() => {
  // 监听 .main / .canvas / .canvas-wrap 大小变化,重算 ruler offset
  if (mainRef.value && "ResizeObserver" in window) {
    rulerResizeObserver = new ResizeObserver(() => measureRulerOffsets());
    rulerResizeObserver.observe(mainRef.value);
    const canvas = mainRef.value.querySelector(".canvas");
    if (canvas) rulerResizeObserver.observe(canvas);
    const wrap = mainRef.value.querySelector(".canvas-wrap");
    if (wrap) rulerResizeObserver.observe(wrap);
  }
  // 子组件 DesignerCanvas onMounted 时 mainRef 可能尚未绑定,这里补一次
  // 下一帧重测,确保 ruler 0 刻度在第一帧就与画布 0mm 对齐
  nextTick(() => {
    measureRulerOffsets();
    requestAnimationFrame(() => measureRulerOffsets());
  });
});
onBeforeUnmount(() => {
  rulerResizeObserver?.disconnect();
});

// paper / zoom / pan 变化时 canvas 视觉位置变,需要重测
watch(
  () => [
    designer.template.value.paper.width,
    designer.template.value.paper.height,
    designer.zoom.value,
    panOffset.value.x,
    panOffset.value.y,
  ],
  () => nextTick(measureRulerOffsets),
);

/** 选中元素 4 边位置 + 范围(在 ruler 上画蓝短线 + 浅蓝填充) */
const INDICATOR_COLOR = "rgba(22, 119, 255, 0.5)";
const RANGE_COLOR = "rgba(22, 119, 255, 0.18)";

/** 多页之间的纵向间距(mm)。跟 DesignerCanvas.vue / useCanvasDrag.ts 保持一致 */
const PAGE_SPACING_MM = 10;

/** 当前选中元素所在 page 的纵向 mm 偏移(ruler 的 y 坐标是全局的,
 *  el.y / el.y+el.h 是 page-local mm,需要加 pageOffsetMm 才能正确映射到左侧 ruler)。
 *  选不中元素时返回 0 */
function selectedYOffsetMm(): number {
  const id = designer.selectedId.value;
  if (!id) return 0;
  const tpl = designer.template.value;
  const idx = findElementGlobal(tpl, id)?.pageIndex ?? 0;
  return idx * (tpl.paper.height + PAGE_SPACING_MM);
}

const rulerIndicatorsH = computed(() => {
  const el = designer.selected.value;
  if (!el) return [];
  return [
    { position: el.x, color: INDICATOR_COLOR },
    { position: el.x + el.w, color: INDICATOR_COLOR },
  ];
});
const rulerIndicatorsV = computed(() => {
  const el = designer.selected.value;
  if (!el) return [];
  const pageOffsetMm = selectedYOffsetMm();
  return [
    { position: el.y + pageOffsetMm, color: INDICATOR_COLOR },
    { position: el.y + el.h + pageOffsetMm, color: INDICATOR_COLOR },
  ];
});
const rulerRangeH = computed(() => {
  const el = designer.selected.value;
  if (!el) return null;
  return { start: el.x, end: el.x + el.w, color: RANGE_COLOR };
});
const rulerRangeV = computed(() => {
  const el = designer.selected.value;
  if (!el) return null;
  const pageOffsetMm = selectedYOffsetMm();
  return {
    start: el.y + pageOffsetMm,
    end: el.y + el.h + pageOffsetMm,
    color: RANGE_COLOR,
  };
});
/** 选中元素的 mm 数字 chip(在 Ruler.vue 浮层画,chip 按 side 决定偏移方向避让 indicator 短线) */
const rulerLabelsH = computed(() => {
  const el = designer.selected.value;
  if (!el) return [];
  return [
    { mm: el.x, text: formatSelectedMm(el.x), color: "#69c0ff", side: "left" as const },
    { mm: el.x + el.w, text: formatSelectedMm(el.x + el.w), color: "#69c0ff", side: "right" as const },
  ];
});
const rulerLabelsV = computed(() => {
  const el = designer.selected.value;
  if (!el) return [];
  const pageOffsetMm = selectedYOffsetMm();
  return [
    {
      mm: el.y + pageOffsetMm,
      text: formatSelectedMm(el.y + pageOffsetMm),
      color: "#69c0ff",
      side: "top" as const,
    },
    {
      mm: el.y + el.h + pageOffsetMm,
      text: formatSelectedMm(el.y + el.h + pageOffsetMm),
      color: "#69c0ff",
      side: "bottom" as const,
    },
  ];
});
/** mm → 显示文本(整数 mm,带 1 位小数;沿用 SnapAndSelfLinesOverlay.formatMm 语义) */
function formatSelectedMm(mm: number): string {
  return mm.toFixed(1).replace(/\.0$/, "");
}

function onKeyDown(e: KeyboardEvent) {
  if (e.code === "Space" && !spaceHeld.value) {
    // 仅在非输入控件聚焦时响应
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    e.preventDefault(); // 阻止浏览器默认的 Space 滚动页面行为
    spaceHeld.value = true;
  }
  if (e.code === "Delete" || e.code === "Backspace") {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const ids = designer.multiSelectedIds.value;
    if (ids.length > 0) {
      e.preventDefault();
      designer.removeMany(ids);
    }
  }
  if (e.key === "Escape") {
    designer.clearSelection();
  }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.code === "Space") spaceHeld.value = false;
}

onMounted(() => {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);
});

function onTogglePan() {
  togglePan.value = !togglePan.value;
}

function onCanvasPan(dx: number, dy: number) {
  panOffset.value = { x: panOffset.value.x + dx, y: panOffset.value.y + dy };
}

// 派生:当前选中文本元素的状态
const selectedText = computed<TextElement | null>(() => {
  const el = designer.selected.value;
  return el && el.type === "text" ? el : null;
});
const isText = computed(() => !!selectedText.value);
const currentFontSize = computed<number | null>(
  () => selectedText.value?.fontSize ?? null,
);
const currentFontFamily = computed<string | null>(
  () => selectedText.value?.fontFamily ?? null,
);
const currentTextColor = computed<string | null>(
  () => selectedText.value?.color ?? null,
);
const currentBgColor = computed<string | null>(
  () => selectedText.value?.backgroundColor ?? null,
);
const boldActive = computed(() => {
  const fw = selectedText.value?.fontWeight;
  return fw === "bold" || fw === "700" || fw === "900";
});
const italicActive = computed(() => selectedText.value?.fontStyle === "italic");
const writingModeActive = computed(() => {
  const wm = selectedText.value?.writingMode;
  return wm === "vertical-rl" || wm === "vertical-lr";
});
const underlineActive = computed(
  () => selectedText.value?.textDecoration === "underline",
);
const strikeActive = computed(
  () => selectedText.value?.textDecoration === "line-through",
);

function onAdd(type: ElementType, pageIndex?: number, position?: { x: number; y: number }) {
  designer.add(type, pageIndex, position);
}

function onMove(id: string, x: number, y: number) {
  designer.update(id, { x, y });
}

function onResize(
  id: string,
  patch: { x: number; y: number; w: number; h: number },
) {
  designer.update(id, patch);
}

function onRotate(id: string, deg: number) {
  designer.update(id, { rotate: deg } as Partial<Element>);
}

function onCtxAction(
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
) {
  switch (action) {
    case "copy":
      if (payload?.id) designer.copyElement(payload.id);
      break;
    case "cut":
      if (payload?.id) designer.cutElement(payload.id);
      break;
    case "paste":
      designer.pasteElement(payload?.x, payload?.y);
      break;
    case "bringToFront":
      if (payload?.id) designer.bringToFront(payload.id);
      break;
    case "sendToBack":
      if (payload?.id) designer.sendToBack(payload.id);
      break;
    case "moveUp":
      if (payload?.id) designer.moveUp(payload.id);
      break;
    case "moveDown":
      if (payload?.id) designer.moveDown(payload.id);
      break;
    case "toggleLock": {
      if (!payload?.id) break;
      const e = designer.selected.value;
      designer.setLocked(payload.id, !e?.locked);
      break;
    }
    case "undo":
      designer.undo();
      break;
    case "redo":
      designer.redo();
      break;
  }
}

function onUpdate(id: string, patch: Partial<Element>) {
  designer.update(id, patch);
}

function onRemove(id: string) {
  designer.remove(id);
}

function onSelectMany(ids: string[]) {
  designer.selectMany(ids);
}

function onAlignAll(
  mode: "left" | "center" | "right" | "top" | "middle" | "bottom",
) {
  designer.alignSelectedElements(mode);
}

/** HeaderToolbar layer 按钮(置顶/置底/上移/下移) */
function onLayerMove(mode: "front" | "back" | "forward" | "backward") {
  const ids = designer.multiSelectedIds.value;
  if (ids.length === 0) return;
  for (const id of ids) {
    if (mode === "front") designer.bringToFront(id);
    else if (mode === "back") designer.sendToBack(id);
    else if (mode === "forward") designer.moveUp(id);
    else designer.moveDown(id);
  }
}

/** HeaderToolbar 复制/剪切/粘贴:用 store 单元素版本 */
function onCopyElement() {
  const id = designer.selectedId.value;
  if (id) designer.copyElement(id);
}
function onCutElement() {
  const id = designer.selectedId.value;
  if (id) designer.cutElement(id);
}
function onPasteElement() {
  designer.pasteElement();
}

/** HeaderToolbar 缩放 +/- 按钮 */
function onSetZoom(z: number) {
  designer.setZoom(z);
}
function onResetZoom() {
  designer.setZoom(1);
}

/** HeaderToolbar 清除格式(text) */
function onClearFormat() {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, {
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    fontSize: 3.7,
  } as Partial<TextElement>);
}

/** HeaderToolbar 重置旋转 */
function onResetRotation() {
  const id = designer.selectedId.value;
  if (!id) return;
  designer.update(id, { rotate: 0 } as Partial<Element>);
}

/** TextQuickToolbar 文本字段 patch */
function onTextPatch(patch: Partial<TextElement>) {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, patch);
}

function onSetPaper(paper: { width: number; height: number }) {
  designer.setPaper(paper);
}

function onSetCanvasBackground(color: string) {
  designer.setCanvasBackground(color);
}

function onToggleGrid() {
  designer.toggleGrid();
}

function onOpenHeaderFooterLineAdvanced() {
  // 占位:暂不实现"高级设置"弹窗(颜色/样式/宽度/水平宽度),只保留 UI 入口
}

function onFontSizeStep(delta: number) {
  const id = designer.selectedId.value;
  const t = selectedText.value;
  if (!id || !t) return;
  const next = Math.max(2, Math.min(30, (t.fontSize ?? 3.7) + delta));
  designer.update(id, { fontSize: next } as Partial<TextElement>);
}

function onFontFamily(family: string) {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, {
    fontFamily: family || undefined,
  } as Partial<TextElement>);
}

function onToggleBold() {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, {
    fontWeight: boldActive.value ? "normal" : "bold",
  } as Partial<TextElement>);
}

function onToggleWritingMode() {
  const t = selectedText.value;
  if (!t) return;
  const next: TextElement["writingMode"] = writingModeActive.value
    ? "horizontal-tb"
    : "vertical-rl";
  designer.update(t.id, {
    writingMode: next,
  } as Partial<TextElement>);
}

function onToggleItalic() {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, {
    fontStyle: italicActive.value ? "normal" : "italic",
  } as Partial<TextElement>);
}

function onToggleUnderline() {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, {
    textDecoration: underlineActive.value ? "none" : "underline",
  } as Partial<TextElement>);
}

function onToggleStrike() {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, {
    textDecoration: strikeActive.value ? "none" : "line-through",
  } as Partial<TextElement>);
}

function onTextColor(color: string) {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, { color } as Partial<TextElement>);
}

function onBgColor(color: string) {
  const t = selectedText.value;
  if (!t) return;
  designer.update(t.id, { backgroundColor: color } as Partial<TextElement>);
}

async function onPrint() {
  const ok = await printTemplate(
    designer.template.value,
    props.printData,
    designer.pageMarginHorizontal.value,
    designer.pageMarginVertical.value,
  );
  if (ok) emit("printOk");
  else emit("printError");
}

async function onPreview() {
  // 渲染 inner HTML(.paper 区块)给 v-html,避免内嵌 doctype
  previewHtml.value = renderInner(
    designer.template.value,
    props.printData,
    designer.pageMarginHorizontal.value,
    designer.pageMarginVertical.value,
  );
  previewVisible.value = true;
}

function onSave() {
  designer.markClean();
  emit("save", designer.template.value);
}

function onReset() {
  designer.load(createTemplate());
  emit("notice", "已重置为空白模板", "info");
}

async function onExportPdf() {
  emit("notice", "正在生成 PDF...", "info");
  const ok = await exportPdf(
    designer.template.value,
    props.printData,
    designer.pageMarginHorizontal.value,
    designer.pageMarginVertical.value,
  );
  if (ok) emit("notice", "PDF 已下载", "success");
  else emit("notice", "PDF 生成失败", "error");
}

// ========== JSON 查看 / 导出 ==========

const jsonModalOpen = ref(false);
/** 实时计算(toJson 每次返回新字符串,computed 会因 template 变化重算) */
const jsonText = computed(() => designer.toJson());

function onViewJson() {
  jsonModalOpen.value = true;
}

function onExportJson() {
  const json = designer.toJson();
  if (!json) return;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template.json";
  a.click();
  URL.revokeObjectURL(url);
  emit("notice", "JSON 已下载", "success");
}

function onCopyJson() {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(jsonText.value).then(
      () => emit("notice", "已复制到剪贴板", "success"),
      () => emit("notice", "复制失败", "error"),
    );
  } else {
    emit("notice", "当前浏览器不支持剪贴板 API", "warning");
  }
}

// 隐藏的 file input,触发后调 loadJson
const importInputRef = ref<HTMLInputElement | null>(null);

function onImportJson() {
  importInputRef.value?.click();
}

function onImportFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  // 立刻清空 value,让下次选同一文件也能触发 change
  input.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const raw = (ev.target?.result as string) ?? "";
    const ok = designer.loadJson(raw);
    if (ok) emit("notice", "JSON 导入成功", "success");
    else emit("jsonImportError", raw);
  };
  reader.onerror = () => emit("notice", "文件读取失败", "error");
  reader.readAsText(file);
}

const theme = computed<"light" | "dark">(() =>
  darkMode.value ? "dark" : "light",
);
function onToggleTheme() {
  darkMode.value = !darkMode.value;
  emit(
    "notice",
    darkMode.value ? "已切换到深色模式" : "已切换到浅色模式",
    "info",
  );
}

function onSaveAs() {
  emit("notice", "另存为模板(预留,后续接入模板中心)", "info");
}

async function onExportHtml() {
  emit("notice", "正在生成 HTML...", "info");
  const ok = await exportHtml(
    designer.template.value,
    props.printData,
    designer.pageMarginHorizontal.value,
    designer.pageMarginVertical.value,
  );
  if (ok) emit("notice", "HTML 已下载", "success");
  else emit("notice", "HTML 生成失败", "error");
}

async function onExportImages() {
  emit("notice", "正在生成图片...", "info");
  const ok = await exportImage(
    designer.template.value,
    props.printData,
    designer.pageMarginHorizontal.value,
    designer.pageMarginVertical.value,
  );
  if (ok) emit("notice", "图片 已下载", "success");
  else emit("notice", "图片 生成失败", "error");
}

function onToolbarReorder() {
  emit("notice", "工具条重排(预留)", "info");
}

function onHelp() {
  emit("notice", "帮助(预留)", "info");
}

function onSettings() {
  emit("notice", "设置(预留)", "info");
}

// 暴露给父组件:打印 / 导入导出
defineExpose({
  designer,
  toJson: () => designer.toJson(),
  loadJson: (raw: string) => {
    const ok = designer.loadJson(raw);
    if (!ok) emit("jsonImportError", raw);
    return ok;
  },
  print: () => onPrint(),
});
</script>

<style scoped>
.print-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #f5f5f5;
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative; /* Ruler / PropertyPanel 浮层锚定 */
  overflow: hidden;
}
/* Ruler 浮在 .main 内部,top:0 left:0 紧贴 .main 顶 0 左 0;
 * panel 由 .main 自身 left 偏移避(panel 在 .body 内 .main 之前) */
.ruler-slot {
  position: absolute;
  z-index: 35; /* 高于 TextQuickToolbar(30),确保顶部/左侧标尺盖住文本快捷工具条 */
  pointer-events: none; /* 让下层 canvas 接收事件;Ruler 自己内部 pointer-events: auto */
}
.ruler-slot-h {
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
}
/* ruler-v 跟 ruler-h 浮层同位置(都 top:0, left:0),0 屏幕位置重合;
 * 角落 32x32 ruler-h/ruler-v 双重画(简单方案,不裁剪) */
.ruler-slot-v {
  top: 0;
  left: 0;
  bottom: 0;
  width: 32px;
}
/* ruler-h / ruler-v 交汇处 32x32 干净方块,盖住双重刻度,边框跟两条 ruler 的 border 视觉对齐 */
.ruler-corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 32px;
  height: 32px;
  z-index: 36; /* 高于 ruler-slot(35),把角落的双重内容遮住 */
  background: #f9fafb;
  border-right: 1px solid #d8d8de;
  border-bottom: 1px solid #d8d8de;
  pointer-events: auto; /* 角落不开 guide 拖动,避免误触 */
  cursor: default;
}
.ruler-corner.dark {
  background: #1f2937;
}
.main {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
  /* 横纵滚都交给 .canvas-wrap,这里不 overflow */
  overflow: hidden;
}

/* JSON 弹窗 */
.json-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.json-modal {
  width: 720px;
  max-width: 90vw;
  max-height: 80vh;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.json-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.json-modal-close {
  background: transparent;
  border: 0;
  font-size: 20px;
  line-height: 1;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
}
.json-modal-close:hover {
  color: #333;
}
.json-modal-body {
  flex: 1;
  margin: 0;
  padding: 12px 16px;
  overflow: auto;
  background: #f6f8fa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #24292e;
  white-space: pre;
}
.json-modal-footer {
  padding: 8px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  background: #fafafa;
}
.json-copy-btn {
  padding: 4px 14px;
  font-size: 13px;
  color: #fff;
  background: #1677ff;
  border: 1px solid #1677ff;
  border-radius: 4px;
  cursor: pointer;
}
.json-copy-btn:hover {
  background: #4096ff;
  border-color: #4096ff;
}
</style>
