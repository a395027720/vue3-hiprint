<!--
  HeaderToolbar — 7 组工具条(editor / paper / zoom / hand / panel / quick / system)。

  视觉结构仿照三方设计器:浅灰胶囊容器(bg-gray-100 rounded-lg p-1),
  组间用 h-6 w-px bg-gray-300 竖线分隔。
  editor 组超出时可横向滚动,左右各有翻页箭头。

  数据流:
  - 单向 prop(状态镜像,PrintDesigner 把 store 的 derived 值传进来)
  - emit 一一列举(对应 store 方法 + 部分穿透到 PrintDesigner 的顶层动作)
-->
<template>
  <div class="htb">
    <!-- editor 组(可滚动,内容最多) -->
    <div class="vtb-editor-group">
      <button
        v-if="isOverflow"
        class="vtb-scroll"
        :disabled="!canScrollLeft"
        title="向左滚动"
        @click="scrollBy(-1)"
      >
        <span v-html="chevronLeftIcon" />
      </button>

      <div
        ref="scrollerRef"
        class="vtb-scroll-area"
        @scroll="updateScrollState"
      >
        <div class="vtb-content" :class="{ 'is-end': !isOverflow }">
          <div class="vtb-pill">
            <button
              class="vtb-tb"
              :disabled="!canUndo"
              title="撤销"
              @click="$emit('undo')"
            >
              <span v-html="undoIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!canRedo"
              title="重做"
              @click="$emit('redo')"
            >
              <span v-html="redoIcon" />
            </button>
          </div>
          <!-- 字体 + 字号 + B/I/U/S + 竖排 + 颜色 + 清除 + 旋转复位 -->
          <div class="vtb-pill">
            <select
              class="vtb-select"
              :value="fontFamily ?? ''"
              :disabled="!isText"
              title="字体"
              @change="onFontFamilyChange"
            >
              <optgroup v-for="g in fontGroups" :key="g.label" :label="g.label">
                <option v-for="o in g.options" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </optgroup>
            </select>
            <span class="vtb-pill-sep" />
            <button
              class="vtb-step"
              :disabled="!isText"
              title="减小字号"
              @click="$emit('fontSizeStep', -1)"
            >
              −
            </button>
            <input
              class="vtb-num"
              :value="fontSizePx"
              :disabled="!isText"
              min="8"
              max="113"
              step="1"
              title="字号 (px)"
              @change="onFontSizeChange"
            />
            <button
              class="vtb-step"
              :disabled="!isText"
              title="增大字号"
              @click="$emit('fontSizeStep', 1)"
            >
              +
            </button>
            <span class="vtb-pill-sep" />
            <button
              class="vtb-tb"
              :class="{ active: boldActive }"
              :disabled="!isText"
              title="粗体"
              @click="$emit('toggleBold')"
            >
              <b>B</b>
            </button>
            <button
              class="vtb-tb"
              :class="{ active: italicActive }"
              :disabled="!isText"
              title="斜体"
              @click="$emit('toggleItalic')"
            >
              <i>I</i>
            </button>
            <button
              class="vtb-tb"
              :class="{ active: underlineActive }"
              :disabled="!isText"
              title="下划线"
              @click="$emit('toggleUnderline')"
            >
              <u>U</u>
            </button>
            <button
              class="vtb-tb"
              :class="{ active: strikeActive }"
              :disabled="!isText"
              title="删除线"
              @click="$emit('toggleStrike')"
            >
              <s>S</s>
            </button>
            <button
              class="vtb-tb"
              :class="{ active: writingModeActive }"
              :disabled="!isText"
              title="竖排文本"
              @click="$emit('toggleWritingMode')"
            >
              <span v-html="verticalTextIcon" />
            </button>
            <ColorPicker
              :model-value="textColor ?? ''"
              :disabled="!isText"
              :allow-transparent="true"
              @update:model-value="onTextColorPicker"
            >
              <template #trigger="{ onClick, onMousedown }">
                <button
                  type="button"
                  class="vtb-color-trigger"
                  :disabled="!isText"
                  title="文本颜色"
                  @click="onClick"
                  @mousedown="onMousedown"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="1em"
                    height="1em"
                    class="cp-icon"
                  >
                    <path
                      fill="currentColor"
                      d="M6.4 18h2.1l1.1-3.05h4.8L15.5 18h2.1L13.05 6h-2.1L6.4 18zm3.8-4.8l1.75-4.95h.1l1.75 4.95H10.2zM4 22q-.825 0-1.412-.587T2 20V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v16q0 .825-.587 1.413T20 22H4z"
                    />
                  </svg>
                  <span
                    class="cp-swatch"
                    :style="{ backgroundColor: textColor ?? 'transparent' }"
                  />
                </button>
              </template>
            </ColorPicker>
            <ColorPicker
              :model-value="bgColor ?? ''"
              :disabled="!isText"
              :allow-transparent="true"
              @update:model-value="onBgColorPicker"
            >
              <template #trigger="{ onClick, onMousedown }">
                <button
                  type="button"
                  class="vtb-color-trigger"
                  :disabled="!isText"
                  title="背景颜色"
                  @click="onClick"
                  @mousedown="onMousedown"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="1em"
                    height="1em"
                    class="cp-icon"
                  >
                    <path
                      fill="currentColor"
                      d="M6.175 1.4L7.6 0l8.575 8.575q.575.575.575 1.425t-.575 1.425l-4.75 4.75q-.575.575-1.425.575t-1.425-.575l-4.75-4.75Q3.25 10.85 3.25 10t.575-1.425L8.575 3.8zM10 5.225L5.225 10h9.55zm7.588 11.188Q17 15.825 17 15q0-.525.313-1.125T18 12.75q.225-.3.475-.625T19 11.5q.275.3.525.625t.475.625q.375.525.688 1.125T21 15q0 .825-.587 1.413T19 17t-1.412-.587M2 24v-4h20v4z"
                    />
                  </svg>
                  <span class="cp-swatch cp-swatch-transparent">
                    <span class="cp-swatch-checker" />
                    <span
                      class="cp-swatch-fill"
                      :style="{ backgroundColor: bgColor ?? 'transparent' }"
                    />
                    <span class="cp-swatch-strike" />
                  </span>
                </button>
              </template>
            </ColorPicker>
            <button
              class="vtb-tb"
              :disabled="!isText"
              title="清除格式"
              @click="$emit('clearFormat')"
            >
              <span v-html="formatClearIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="重置旋转"
              @click="$emit('resetRotation')"
            >
              <span v-html="rotateResetIcon" />
            </button>
          </div>

          <span class="vtb-group-sep" />

          <!-- 对齐 + 表格合并/分割 -->
          <div class="vtb-pill">
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="左对齐"
              @click="$emit('align', 'left')"
            >
              <span v-html="alignLeftIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="水平居中"
              @click="$emit('align', 'center')"
            >
              <span v-html="alignCenterHIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="右对齐"
              @click="$emit('align', 'right')"
            >
              <span v-html="alignRightIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="顶对齐"
              @click="$emit('align', 'top')"
            >
              <span class="rotate-90" v-html="alignLeftIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="垂直居中"
              @click="$emit('align', 'middle')"
            >
              <span class="rotate-90" v-html="alignCenterHIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="底对齐"
              @click="$emit('align', 'bottom')"
            >
              <span class="rotate-90" v-html="alignRightIcon" />
            </button>
          </div>

          <span class="vtb-group-sep" />

          <!-- 尺寸匹配 + 分布 -->
          <div class="vtb-pill">
            <button
              class="vtb-tb"
              :disabled="!canMatchSize"
              title="匹配宽度"
              @click="$emit('matchSize', 'width')"
            >
              <span v-html="widthIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!canMatchSize"
              title="匹配高度"
              @click="$emit('matchSize', 'height')"
            >
              <span v-html="heightIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!canMatchSize"
              title="匹配尺寸"
              @click="$emit('matchSize', 'both')"
            >
              <span v-html="ratioIcon" />
            </button>
            <span class="vtb-pill-sep" />
            <button
              class="vtb-tb"
              :disabled="!canDistribute"
              title="水平等距分布"
              @click="$emit('distribute', 'horizontal')"
            >
              <span v-html="hDistIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!canDistribute"
              title="垂直等距分布"
              @click="$emit('distribute', 'vertical')"
            >
              <span v-html="vDistIcon" />
            </button>
          </div>

          <span class="vtb-group-sep" />

          <!-- 层级 -->
          <div class="vtb-pill">
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="置顶"
              @click="$emit('layer', 'front')"
            >
              <span v-html="bringFrontIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="置底"
              @click="$emit('layer', 'back')"
            >
              <span v-html="sendBackIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="上移一层"
              @click="$emit('layer', 'forward')"
            >
              <span v-html="moveUpIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="下移一层"
              @click="$emit('layer', 'backward')"
            >
              <span v-html="moveDownIcon" />
            </button>
          </div>

          <span class="vtb-group-sep" />

          <!-- 历史 + 全选 + 剪切/复制/粘贴 + 锁定 + 删除 -->
          <div class="vtb-pill">
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="全选当前页"
              @click="$emit('selectAll')"
            >
              <span v-html="selectAllIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="剪切"
              @click="$emit('cut')"
            >
              <span v-html="cutIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="复制"
              @click="$emit('copy')"
            >
              <span v-html="copyIcon" />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasClipboard"
              title="粘贴"
              @click="$emit('paste')"
            >
              <span v-html="pasteIcon" />
            </button>
            <span class="vtb-pill-sep" />
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              :title="locked ? '解锁' : '锁定'"
              @click="$emit('toggleLock')"
            >
              <lock-outlined v-if="!locked" /><unlock-outlined
                v-else
                style="color: #ff4d4f"
              />
            </button>
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="删除"
              @click="$emit('delete')"
            >
              <span v-html="trashIcon" />
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="isOverflow"
        class="vtb-scroll"
        :disabled="!canScrollRight"
        title="向右滚动"
        @click="scrollBy(1)"
      >
        <span v-html="chevronRightIcon" />
      </button>
    </div>

    <div class="vtb-content">
      <!-- paper 组 -->
      <div class="vtb-pill">
        <PaperSettings
          :paper-width="paperWidth"
          :paper-height="paperHeight"
          :canvas-background="canvasBackground"
          :show-grid="showGrid"
          :page-margin-horizontal="pageMarginHorizontal"
          :page-margin-vertical="pageMarginVertical"
          :allow-drag-outside-canvas="allowDragOutsideCanvas"
          :header-line-color="headerLineColor"
          :header-line-width="headerLineWidth"
          :header-line-style="headerLineStyle"
          :header-line-span="headerLineSpan"
          :header-line-span-mode="headerLineSpanMode"
          :header-height="headerHeight"
          :show-header-line="showHeaderLine"
          :footer-line-color="footerLineColor"
          :footer-line-width="footerLineWidth"
          :footer-line-style="footerLineStyle"
          :footer-line-span="footerLineSpan"
          :footer-line-span-mode="footerLineSpanMode"
          :footer-height="footerHeight"
          :show-footer-line="showFooterLine"
          @set-paper="onSetPaper"
          @set-canvas-background="onSetCanvasBackground"
          @toggle-grid="onToggleGrid"
          @set-page-margin-horizontal="onSetPageMarginHorizontal"
          @set-page-margin-vertical="onSetPageMarginVertical"
          @set-allow-drag-outside-canvas="onSetAllowDragOutsideCanvas"
          @set-header-line-color="onSetHeaderLineColor"
          @set-header-line-width="onSetHeaderLineWidth"
          @set-header-line-style="onSetHeaderLineStyle"
          @set-header-line-span="onSetHeaderLineSpan"
          @set-header-line-span-mode="onSetHeaderLineSpanMode"
          @set-header-height="onSetHeaderHeight"
          @toggle-show-header-line="onToggleShowHeaderLine"
          @set-footer-line-color="onSetFooterLineColor"
          @set-footer-line-width="onSetFooterLineWidth"
          @set-footer-line-style="onSetFooterLineStyle"
          @set-footer-line-span="onSetFooterLineSpan"
          @set-footer-line-span-mode="onSetFooterLineSpanMode"
          @set-footer-height="onSetFooterHeight"
          @toggle-show-footer-line="onToggleShowFooterLine"
          @open-header-footer-line-advanced="$emit('openHeaderFooterLineAdvanced')"
        />
      </div>

      <span class="vtb-group-sep" />

      <!-- zoom 组 -->
      <div class="vtb-pill">
        <button
          class="vtb-tb"
          title="缩小"
          @click="$emit('setZoom', zoom - 0.1)"
        >
          <span v-html="zoomOutIcon" />
        </button>
        <button class="vtb-zoom-label" title="缩放" @click="$emit('resetZoom')">
          {{ zoomPercent }}%
        </button>
        <button
          class="vtb-tb"
          title="放大"
          @click="$emit('setZoom', zoom + 0.1)"
        >
          <span v-html="zoomInIcon" />
        </button>
      </div>

      <!-- hand 组 -->
      <div class="vtb-pill">
        <button
          class="vtb-tb"
          :class="{ active: panMode }"
          title="手型拖动(空格临时)"
          @click="$emit('togglePan')"
        >
          <span v-html="handIcon" />
        </button>
      </div>

      <!-- panel 组:三个 toggle 按钮(浮层显隐) -->
      <div class="vtb-pill">
        <button
          class="vtb-tb"
          :class="{ active: leftPanelOpen }"
          title="切换左侧元素面板"
          @click="$emit('toggleLeftPanel')"
        >
          <span v-html="appstoreIcon" />
        </button>
        <button
          class="vtb-tb"
          :class="{ active: propertyPanelOpen }"
          title="切换右侧属性面板"
          @click="$emit('togglePropertyPanel')"
        >
          <span v-html="settingIcon" />
        </button>
      </div>

      <!-- quick 组:导出 + 预览 + 打印 -->
      <div class="vtb-pill">
        <button class="vtb-tb" title="导出 PDF" @click="$emit('exportPdf')">
          <span v-html="filePdfIcon" />
        </button>
        <button class="vtb-tb" title="导出 HTML" @click="$emit('exportHtml')">
          <span v-html="fileTextIcon" />
        </button>
        <button class="vtb-tb" title="导出图片" @click="$emit('exportImages')">
          <span v-html="pictureIcon" />
        </button>
        <span class="vtb-pill-sep" />
        <button class="vtb-tb" title="预览" @click="$emit('preview')">
          <span v-html="eyeIcon" />
        </button>
        <button class="vtb-tb" title="打印" @click="$emit('print')">
          <span v-html="printerIcon" />
        </button>
      </div>

      <span class="vtb-group-sep" />

      <!-- system 组:主题 + 帮助 + 设置 -->
      <div class="vtb-pill">
        <button
          class="vtb-tb"
          :title="theme === 'dark' ? '切换到亮色' : '切换到暗色'"
          @click="$emit('toggleTheme')"
        >
          <span v-html="theme === 'dark' ? bulbOutlineIcon : bulbFilledIcon" />
        </button>
        <button class="vtb-tb" title="帮助" @click="$emit('help')">
          <span v-html="questionIcon" />
        </button>
        <button class="vtb-tb" title="设置" @click="$emit('settings')">
          <span v-html="settingIcon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import ColorPicker from "../common/ColorPicker.vue";
import PaperSettings from "./PaperSettings.vue";

interface FontOption {
  value: string;
  label: string;
}

interface FontGroup {
  label: string;
  options: FontOption[];
}

// 三方样式:常用 / 中文字体 / 西文字体 / 等宽字体
const FONT_GROUPS: FontGroup[] = [
  {
    label: "常用",
    options: [
      { value: "", label: "默认" },
      { value: "system-ui, sans-serif", label: "系统默认" },
    ],
  },
  {
    label: "中文字体",
    options: [
      { value: 'SimSun, "宋体", serif', label: "宋体" },
      { value: 'SimHei, "黑体", sans-serif', label: "黑体" },
      { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: "微软雅黑" },
      { value: 'KaiTi, "楷体", serif', label: "楷体" },
      { value: 'FangSong, "仿宋", serif', label: "仿宋" },
    ],
  },
  {
    label: "西文字体",
    options: [
      { value: "Arial, sans-serif", label: "Arial" },
      { value: '"Times New Roman", serif', label: "Times New Roman" },
      { value: "Georgia, serif", label: "Georgia" },
      { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
      { value: "Verdana, sans-serif", label: "Verdana" },
    ],
  },
  {
    label: "等宽字体",
    options: [
      { value: '"Courier New", monospace', label: "Courier New" },
      { value: 'Consolas, "Courier New", monospace', label: "Consolas" },
      { value: "Monaco, monospace", label: "Monaco" },
    ],
  },
];
const fontGroups = FONT_GROUPS;

const props = defineProps<{
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  hasSelection: boolean;
  /** 主选是否锁定 */
  locked: boolean;
  /** 多选数量(用于 匹配/分布 启用条件) */
  multiCount: number;
  /** 当前选中文本元素 */
  isText: boolean;
  /** 字号 */
  fontSize: number | null;
  /** 字体 */
  fontFamily: string | null;
  /** 字色 */
  textColor: string | null;
  /** 背景色(text 元素) */
  bgColor: string | null;
  /** 样式激活态 */
  boldActive: boolean;
  italicActive: boolean;
  underlineActive: boolean;
  strikeActive: boolean;
  writingModeActive: boolean;
  /** 纸张宽 (mm) */
  paperWidth: number;
  /** 纸张高 (mm) */
  paperHeight: number;
  /** 画布背景色 */
  canvasBackground: string;
  /** 水平页面边距 (mm) */
  pageMarginHorizontal: number;
  /** 垂直页面边距 (mm) */
  pageMarginVertical: number;
  /** 是否允许元素拖出画布 */
  allowDragOutsideCanvas: boolean;
  /** 表头分隔线 */
  headerLineColor: string;
  headerLineWidth: number;
  headerLineStyle: "solid" | "dashed" | "dotted";
  headerLineSpan: number;
  headerLineSpanMode: "value" | "percent";
  headerHeight: number;
  showHeaderLine: boolean;
  /** 页脚分隔线 */
  footerLineColor: string;
  footerLineWidth: number;
  footerLineStyle: "solid" | "dashed" | "dotted";
  footerLineSpan: number;
  footerLineSpanMode: "value" | "percent";
  footerHeight: number;
  showFooterLine: boolean;
  /** 缩放比例(1 = 100%) */
  zoom: number;
  /** 手型模式 */
  panMode: boolean;
  /** 主题 */
  theme: "light" | "dark";
  /** 剪贴板非空 */
  hasClipboard: boolean;
  /** 左侧元素面板开 */
  leftPanelOpen: boolean;
  /** 右侧属性面板开 */
  propertyPanelOpen: boolean;
}>();

const emit = defineEmits<{
  undo: [];
  redo: [];
  toggleGrid: [];
  toggleTheme: [];
  togglePan: [];
  toggleLock: [];
  toggleLeftPanel: [];
  togglePropertyPanel: [];
  selectAll: [];
  cut: [];
  copy: [];
  paste: [];
  delete: [];
  align: [mode: "left" | "center" | "right" | "top" | "middle" | "bottom"];
  matchSize: [mode: "width" | "height" | "both"];
  distribute: [axis: "horizontal" | "vertical"];
  layer: [mode: "front" | "back" | "forward" | "backward"];
  fontSizeStep: [delta: number];
  fontFamily: [family: string];
  onTextColor: [color: string];
  onBgColor: [color: string];
  toggleBold: [];
  toggleItalic: [];
  toggleUnderline: [];
  toggleStrike: [];
  toggleWritingMode: [];
  clearFormat: [];
  resetRotation: [];
  setPaper: [paper: { width: number; height: number }];
  setCanvasBackground: [color: string];
  toggleGrid: [];
  setPageMarginHorizontal: [mm: number];
  setPageMarginVertical: [mm: number];
  setAllowDragOutsideCanvas: [allow: boolean];
  setHeaderLineColor: [color: string];
  setHeaderLineWidth: [mm: number];
  setHeaderLineStyle: [style: "solid" | "dashed" | "dotted"];
  setHeaderLineSpan: [v: number];
  setHeaderLineSpanMode: [m: "value" | "percent"];
  setHeaderHeight: [mm: number];
  toggleShowHeaderLine: [];
  setFooterLineColor: [color: string];
  setFooterLineWidth: [mm: number];
  setFooterLineStyle: [style: "solid" | "dashed" | "dotted"];
  setFooterLineSpan: [v: number];
  setFooterLineSpanMode: [m: "value" | "percent"];
  setFooterHeight: [mm: number];
  toggleShowFooterLine: [];
  openHeaderFooterLineAdvanced: [];
  setZoom: [z: number];
  resetZoom: [];
  exportPdf: [];
  exportHtml: [];
  exportImages: [];
  preview: [];
  print: [];
  help: [];
  settings: [];
}>();

const zoomPercent = computed(() => Math.round((props.zoom ?? 1) * 100));
const canMatchSize = computed(() => props.multiCount >= 2);
const canDistribute = computed(() => props.multiCount >= 3);

// 工具条横向滚动
const scrollerRef = ref<HTMLElement | null>(null);
const isOverflow = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
function updateScrollState() {
  const el = scrollerRef.value;
  if (!el) {
    isOverflow.value = false;
    canScrollLeft.value = false;
    canScrollRight.value = false;
    return;
  }
  const overflow = el.scrollWidth > el.clientWidth + 1;
  isOverflow.value = overflow;
  canScrollLeft.value = el.scrollLeft > 1;
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
}
function scrollBy(direction: -1 | 1) {
  const el = scrollerRef.value;
  if (!el) return;
  el.scrollBy({
    left: direction * Math.max(120, el.clientWidth * 0.6),
    behavior: "smooth",
  });
}

function onFontFamilyChange(e: Event) {
  emit("fontFamily", (e.target as HTMLSelectElement).value);
}
function onFontSizeChange(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  if (!Number.isNaN(v) && v > 0 && props.fontSize != null) {
    // input 是 px,父组件存的是 mm:delta 也要转 mm
    emit("fontSizeStep", (v - Math.round(props.fontSize * 96 / 25.4)) * 25.4 / 96);
  }
}
// ColorPicker 的 update:modelValue 是 string | undefined,
// 上游 onTextColor / onBgColor 约定是 string;undefined(清空)→ '' 保持一致。
function onTextColorPicker(color: string | undefined) {
  emit("onTextColor", color ?? "");
}
function onBgColorPicker(color: string | undefined) {
  emit("onBgColor", color ?? "");
}

function onSetPaper(paper: { width: number; height: number }) {
  emit("setPaper", paper);
}
function onSetCanvasBackground(color: string) {
  emit("setCanvasBackground", color);
}
function onToggleGrid() {
  emit("toggleGrid");
}

function onSetPageMarginHorizontal(mm: number) {
  emit("setPageMarginHorizontal", mm);
}
function onSetPageMarginVertical(mm: number) {
  emit("setPageMarginVertical", mm);
}
function onSetAllowDragOutsideCanvas(allow: boolean) {
  emit("setAllowDragOutsideCanvas", allow);
}

function onSetHeaderLineColor(color: string) {
  emit("setHeaderLineColor", color);
}
function onSetHeaderLineWidth(mm: number) {
  emit("setHeaderLineWidth", mm);
}
function onSetHeaderLineStyle(style: "solid" | "dashed" | "dotted") {
  emit("setHeaderLineStyle", style);
}
function onSetHeaderLineSpan(v: number) {
  emit("setHeaderLineSpan", v);
}
function onSetHeaderLineSpanMode(m: "value" | "percent") {
  emit("setHeaderLineSpanMode", m);
}
function onSetHeaderHeight(mm: number) {
  emit("setHeaderHeight", mm);
}
function onToggleShowHeaderLine() {
  emit("toggleShowHeaderLine");
}

function onSetFooterLineColor(color: string) {
  emit("setFooterLineColor", color);
}
function onSetFooterLineWidth(mm: number) {
  emit("setFooterLineWidth", mm);
}
function onSetFooterLineStyle(style: "solid" | "dashed" | "dotted") {
  emit("setFooterLineStyle", style);
}
function onSetFooterLineSpan(v: number) {
  emit("setFooterLineSpan", v);
}
function onSetFooterLineSpanMode(m: "value" | "percent") {
  emit("setFooterLineSpanMode", m);
}
function onSetFooterHeight(mm: number) {
  emit("setFooterHeight", mm);
}
function onToggleShowFooterLine() {
  emit("toggleShowFooterLine");
}

const fontSizePx = computed(() =>
  props.fontSize == null ? "" : Math.round(props.fontSize * 96 / 25.4),
);

onMounted(() => {
  setTimeout(updateScrollState, 0);
  window.addEventListener("resize", updateScrollState);
});
onBeforeUnmount(() => window.removeEventListener("resize", updateScrollState));

// ===== 内联 SVG icons(heroicons-style 1.5px stroke) =====
const stroke = "currentColor";
const sw = 1.5;
const undoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>`;
const redoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>`;
const handIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M10.05 23q-.75 0-1.4-.337T7.575 21.7L1.2 12.375l.6-.575q.475-.475 1.125-.55t1.175.3L7 13.575V4q0-.425.288-.712T8 3t.713.288T9 4v8h2V2q0-.425.288-.712T12 1t.713.288T13 2v10h2V3q0-.425.288-.712T16 2t.713.288T17 3v9h2V5q0-.425.288-.712T20 4t.713.288T21 5v14q0 1.65-1.175 2.825T17 23z"/></svg>`;
const verticalTextIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M10.9 16L15 5h2l4.1 11h-1.9l-1-2.8h-4.4l-1 2.8zm3.45-4.4h3.3l-1.6-4.55h-.1zM6 20l-3.5-3.5l1.4-1.4L5 16.15V3h2v13.15l1.1-1.05l1.4 1.4z"/></svg>`;
const alignLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`;
const alignCenterHIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
const alignRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>`;
const bringFrontIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"/><path d="M3 18V9h6"/></svg>`;
const sendBackIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"/><path d="M21 9h-6"/></svg>`;
const moveUpIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`;
const moveDownIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></svg>`;
const widthIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="m7 16l-4-4l4-4l1.425 1.4l-1.6 1.6h10.35L15.6 9.4L17 8l4 4l-4 4l-1.4-1.4l1.575-1.6H6.825L8.4 14.6z"/></svg>`;
const heightIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="m12 21l-4-4l1.4-1.4l1.6 1.575V6.825L9.4 8.4L8 7l4-4l4 4l-1.4 1.425l-1.6-1.6v10.35l1.6-1.575L16 17z"/></svg>`;
const ratioIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M14 17h5v-5h-2v3h-3zm-9-5h2V9h3V7H5zm-1 8q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20z"/></svg>`;
const hDistIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6v12M21 6v12M6 9l2 3-2 3M12 9l2 3-2 3M18 9l2 3-2 3"/></svg>`;
const vDistIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M9 6l3 2 3-2M9 12l3 2 3-2M9 18l3 2 3-2"/></svg>`;
const selectAllIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>`;
const cutIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12l5.66 5.66"/></svg>`;
const copyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const pasteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`;
const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
const zoomInIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5C16,5.91 13.09,3 9.5,3C5.91,3 3,5.91 3,9.5C3,13.09 5.91,16 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,5C11.99,5 14,7.01 14,9.5C14,11.99 11.99,14 9.5,14C7.01,14 5,11.99 5,9.5C5,7.01 7.01,5 9.5,5M9,6V8H7V10H9V12H10V10H12V8H10V6H9Z"/></svg>`;
const zoomOutIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5C16,5.91 13.09,3 9.5,3C5.91,3 3,5.91 3,9.5C3,13.09 5.91,16 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,14C7.01,14 5,11.99 5,9.5C5,7.01 7.01,5 9.5,5C11.99,5 14,7.01 14,9.5C14,11.99 11.99,14 9.5,14M7,9H12V10H7V9Z"/></svg>`;
const formatClearIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="m13.2 10.35l-2.325-2.325L7.85 5H20v3h-5.8zm6.6 12.25l-8.3-8.3l-2 4.7H6.225L9.2 12L1.4 4.2l1.4-1.4l18.4 18.4z"/></svg>`;
const rotateResetIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M11 22q-1.25-.125-2.4-.612T6.4 20.1l1.4-1.45q.725.525 1.538.85t1.662.45zm2 0v-2.05q2.6-.375 4.3-2.337T19 13.05q0-2.925-2.037-4.962T12 6.05h-.2l1.6 1.6l-1.4 1.4l-4-4l4-4l1.4 1.45l-1.55 1.55H12q1.875 0 3.513.713t2.85 1.925t1.925 2.85T21 13.05q0 3.425-2.275 5.963T13 22m-8.05-3.35q-.8-1.05-1.288-2.2t-.612-2.4H5.1q.125.85.45 1.663t.85 1.537zm-1.9-6.6q.15-1.275.625-2.45T4.95 7.45l1.45 1.4q-.525.725-.85 1.538T5.1 12.05z"/></svg>`;
const chevronLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" class="relative z-10 h-4 w-4"><path fill="currentColor" d="M15.4 16.6L10.8 12l4.6-4.6L14 6l-6 6l6 6z"/></svg>`;
const chevronRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" class="relative z-10 h-4 w-4"><path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"/></svg>`;
// ===== cp-icon 风格(统一 1em × 1em,单 path fill=currentColor)=====
// panel 组
const appstoreIcon = `<svg viewBox="64 64 896 896" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H212V212h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H612V212h200v200zM464 544H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H212V612h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H612V612h200v200z"/></svg>`;
const settingIcon = `<svg viewBox="64 64 896 896" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z"/></svg>`;
// quick 组
const filePdfIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M9 12.5h1v-2h1q.425 0 .713-.288T12 9.5v-1q0-.425-.288-.712T11 7.5H9zm1-3v-1h1v1zm3 3h2q.425 0 .713-.288T16 11.5v-3q0-.425-.288-.712T15 7.5h-2zm1-1v-3h1v3zm3 1h1v-2h1v-1h-1v-1h1v-1h-2zM8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-4 4q-.825 0-1.412-.587T2 20V6h2v14h14v2z"/></svg>`;
const fileTextIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M0 15V9h1.5v2h2V9H5v6H3.5v-2.5h-2V15zm7.75 0v-4.5H6V9h5v1.5H9.25V15zM12 15v-5q0-.425.288-.712T13 9h4.5q.425 0 .713.288T18.5 10v5H17v-4.5h-1V14h-1.5v-3.5h-1V15zm8 0V9h1.5v4.5H24V15z"/></svg>`;
const pictureIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z"/></svg>`;
const eyeIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V7H5zm3.338-3.113Q6.725 14.776 6 13q.725-1.775 2.338-2.887T12 9t3.663 1.113T18 13q-.725 1.775-2.337 2.888T12 17t-3.662-1.112m2.6-1.826Q10.5 13.626 10.5 13t.438-1.062T12 11.5t1.063.438T13.5 13t-.437 1.063T12 14.5t-1.062-.437m2.837.712Q14.5 14.05 14.5 13t-.725-1.775T12 10.5t-1.775.725T9.5 13t.725 1.775T12 15.5t1.775-.725"/></svg>`;
const printerIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M18 7H6V3h12zm0 5.5q.425 0 .713-.288T19 11.5t-.288-.712T18 10.5t-.712.288T17 11.5t.288.713t.712.287M16 19v-4H8v4zm2 2H6v-4H2v-6q0-1.275.875-2.137T5 8h14q1.275 0 2.138.863T22 11v6h-4z"/></svg>`;
// system 组
const bulbOutlineIcon = `<svg viewBox="64 64 896 896" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M632 888H392c-4.4 0-8 3.6-8 8v32c0 17.7 14.3 32 32 32h192c17.7 0 32-14.3 32-32v-32c0-4.4-3.6-8-8-8zM512 64c-181.1 0-328 146.9-328 328 0 121.4 66 227.4 164 284.1V792c0 17.7 14.3 32 32 32h264c17.7 0 32-14.3 32-32V676.1c98-56.7 164-162.7 164-284.1 0-181.1-146.9-328-328-328zm127.9 549.8L604 634.6V752H420V634.6l-35.9-20.8C305.4 568.3 256 484.5 256 392c0-141.4 114.6-256 256-256s256 114.6 256 256c0 92.5-49.4 176.3-128.1 221.8z"/></svg>`;
const bulbFilledIcon = `<svg viewBox="64 64 896 896" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M348 676.1C250 619.4 184 513.4 184 392c0-181.1 146.9-328 328-328s328 146.9 328 328c0 121.4-66 227.4-164 284.1V792c0 17.7-14.3 32-32 32H380c-17.7 0-32-14.3-32-32V676.1zM392 888h240c4.4 0 8 3.6 8 8v32c0 17.7-14.3 32-32 32H416c-17.7 0-32-14.3-32-32v-32c0-4.4 3.6-8 8-8z"/></svg>`;
const questionIcon = `<svg viewBox="64 64 896 896" width="1em" height="1em" class="cp-icon"><path fill="currentColor" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"/><path fill="currentColor" d="M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7a48.3 48.3 0 0130.9-44.8c59-22.7 97.1-74.7 97.1-132.5.1-39.3-17.1-76-48.3-103.3zM472 732a40 40 0 1080 0 40 40 0 10-80 0z"/></svg>`;
</script>

<style scoped>
.htb {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  background: #f5f5f5;
  border-bottom: 1px solid #f0f0f0;
  user-select: none;
  gap: 0;
  min-width: 0;
}
.vtb-editor-group {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}
.vtb-scroll-area {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.vtb-scroll-area::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.vtb-content {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: max-content;
  padding-right: 4px;
}
.vtb-content.is-end {
  margin-left: auto;
  justify-content: flex-end;
}
.vtb-scroll {
  flex: 0 0 auto;
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  padding: 0;
  background: white;
  border: 1px solid #f9f9f9;
  color: #595959;
  transition:
    background 120ms,
    color 120ms;
}
.vtb-scroll:hover:not(:disabled) {
  color: #1677ff;
}
.vtb-scroll:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
/* <span v-html> 注入的 svg 默认 baseline 偏底,改成 block 让父级 flex 居中生效 */
.vtb-scroll :deep(svg) {
  display: block;
}
.vtb-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border-radius: 6px;
  padding: 2px 6px;
}
.vtb-pill-sep {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: #d9d9d9;
  margin: 0 4px;
  flex: 0 0 auto;
}
.vtb-group-sep {
  display: inline-block;
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 6px;
  flex: 0 0 auto;
}
.vtb-tb,
.vtb-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 26px;
  padding: 0 4px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #444;
  cursor: pointer;
  transition:
    background 120ms,
    border-color 120ms,
    color 120ms;
  flex: 0 0 auto;
}
.vtb-tb :deep(.anticon) {
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
}
/* <span v-html> 注入的 svg 默认 baseline 偏底,改成 block 让父级 flex 居中生效 */
.vtb-tb :deep(svg) {
  display: block;
}
.vtb-step {
  width: 22px;
  font-size: 14px;
  font-weight: 500;
}
.vtb-tb:hover:not(:disabled),
.vtb-step:hover:not(:disabled) {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.vtb-tb.active {
  background: #e6f4ff;
  color: #1677ff;
}
.vtb-tb:disabled,
.vtb-step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.vtb-zoom-label {
  height: 26px;
  min-width: 48px;
  padding: 0 6px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  color: #444;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.vtb-zoom-label:hover {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.vtb-select {
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  outline: none;
  min-width: 100px;
}
.vtb-select:hover {
  border-color: #91caff;
}
.vtb-select:focus {
  border-color: #1677ff;
  background: #fff;
}
.vtb-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.vtb-num {
  width: 44px;
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  text-align: center;
  outline: none;
  flex: 0 0 auto;
}
.vtb-num:hover:not(:disabled),
.vtb-num:focus {
  border-color: #1677ff;
  background: #fff;
}
.vtb-num:disabled {
  background: transparent;
  color: #bfbfbf;
  cursor: not-allowed;
}
.rotate-90 {
  display: inline-block;
  transform: rotate(90deg);
}

/* ===== 颜色按钮 trigger(图标 + 14×3.5 色块) ===== */
.vtb-color-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #444;
  cursor: pointer;
  transition: background 120ms, border-color 120ms, color 120ms;
  flex: 0 0 auto;
  font-size: 16px;
}
.vtb-color-trigger:hover:not(:disabled) {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.vtb-color-trigger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cp-icon {
  display: block;
}
.cp-swatch {
  display: inline-block;
  width: 4px;
  height: 14px;
  border-radius: 1px;
  border: 1px solid #d9d9d9;
  background: transparent;
  flex: 0 0 auto;
}
.cp-swatch-transparent {
  position: relative;
  background: #fff;
}
.cp-swatch-checker {
  position: absolute;
  inset: 0;
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwZ+5wNisxL//8n04mEeRAAAhNwX869V4DYAAAAASUVORK5CYII=");
  background-repeat: repeat;
  background-size: 6px 6px;
  opacity: 0.5;
}
.cp-swatch-fill {
  position: absolute;
  inset: 0;
}
.cp-swatch-strike {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.cp-swatch-strike::before {
  content: "";
  width: 100%;
  height: 1px;
  background: #ff4d4f;
  transform: rotate(-45deg) scale(1.5);
}
</style>
