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
              :value="fontSize ?? ''"
              :disabled="!isText"
              min="1"
              max="200"
              title="字号 (pt)"
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
            <span class="vtb-pill-sep" />
            <label
              class="vtb-color"
              :class="{ disabled: !isText }"
              title="字体颜色"
            >
              <font-colors-outlined />
              <span
                class="vtb-color-swatch"
                :style="{ background: textColor ?? '#000' }"
              />
              <input
                type="color"
                :value="textColor ?? '#000000'"
                :disabled="!isText"
                @input="
                  $emit(
                    'onTextColor',
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
            </label>
            <span class="vtb-pill-sep" />
            <button
              class="vtb-tb"
              :disabled="!isText"
              title="清除格式"
              @click="$emit('clearFormat')"
            >
              <span v-html="formatClearIcon" />
            </button>
            <span class="vtb-pill-sep" />
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
            <span class="vtb-pill-sep" />
            <button
              class="vtb-tb"
              :disabled="!hasSelection"
              title="全选当前页"
              @click="$emit('selectAll')"
            >
              <span v-html="selectAllIcon" />
            </button>
            <span class="vtb-pill-sep" />
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
        <select
          class="vtb-select"
          :value="paperKey"
          title="纸张"
          @change="
            $emit('setPaper', ($event.target as HTMLSelectElement).value)
          "
        >
          <option v-for="p in PAPER_OPTIONS" :key="p.key" :value="p.key">
            {{ p.label }}
          </option>
        </select>
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
          <appstore-outlined />
        </button>
        <button
          class="vtb-tb"
          :class="{ active: propertyPanelOpen }"
          title="切换右侧属性面板"
          @click="$emit('togglePropertyPanel')"
        >
          <setting-outlined />
        </button>
      </div>

      <!-- quick 组:导出 + 预览 + 打印 -->
      <div class="vtb-pill">
        <button class="vtb-tb" title="导出 PDF" @click="$emit('exportPdf')">
          <file-pdf-outlined />
        </button>
        <button class="vtb-tb" title="导出 HTML" @click="$emit('exportHtml')">
          <file-text-outlined />
        </button>
        <button class="vtb-tb" title="导出图片" @click="$emit('exportImages')">
          <picture-outlined />
        </button>
        <span class="vtb-pill-sep" />
        <button class="vtb-tb" title="预览" @click="$emit('preview')">
          <eye-outlined />
        </button>
        <button class="vtb-tb" title="打印" @click="$emit('print')">
          <printer-outlined />
        </button>
      </div>

      <span class="vtb-group-sep" />

      <!-- system 组:网格 + 主题 + 帮助 + 设置 -->
      <div class="vtb-pill">
        <button
          class="vtb-tb"
          :class="{ active: showGrid }"
          title="网格"
          @click="$emit('toggleGrid')"
        >
          <span v-html="gridIcon" />
        </button>
        <button
          class="vtb-tb"
          :title="theme === 'dark' ? '切换到亮色' : '切换到暗色'"
          @click="$emit('toggleTheme')"
        >
          <bulb-outlined v-if="theme === 'dark'" /><bulb-filled v-else />
        </button>
        <button class="vtb-tb" title="帮助" @click="$emit('help')">
          <question-circle-outlined />
        </button>
        <button class="vtb-tb" title="设置" @click="$emit('settings')">
          <setting-outlined />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

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

interface PaperOption {
  key: string;
  label: string;
}
const PAPER_OPTIONS: PaperOption[] = [
  { key: "A4", label: "A4 (210×297mm)" },
  { key: "A5", label: "A5 (148×210mm)" },
  { key: "A3", label: "A3 (297×420mm)" },
  { key: "Letter", label: "Letter (216×279mm)" },
];

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
  /** 样式激活态 */
  boldActive: boolean;
  italicActive: boolean;
  underlineActive: boolean;
  strikeActive: boolean;
  /** 纸张 key */
  paperKey: string;
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
  toggleBold: [];
  toggleItalic: [];
  toggleUnderline: [];
  toggleStrike: [];
  clearFormat: [];
  resetRotation: [];
  setPaper: [key: string];
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
  if (!Number.isNaN(v) && v > 0 && props.fontSize) {
    emit("fontSizeStep", v - props.fontSize);
  }
}

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
const gridIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`;
const handIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6.5a1.5 1.5 0 0 0-3 0v4.5"/><path d="M14 10V4.5a1.5 1.5 0 0 0-3 0V11"/><path d="M10 10.5V5.5a1.5 1.5 0 0 0-3 0V14"/><path d="M18 8a1.5 1.5 0 0 0-3 0"/><path d="M7 15v-3.5a1.5 1.5 0 0 0-3 0V17a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6v-3a1.5 1.5 0 0 0-3 0"/></svg>`;
const alignLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`;
const alignCenterHIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
const alignRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>`;
const bringFrontIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"/><path d="M3 18V9h6"/></svg>`;
const sendBackIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"/><path d="M21 9h-6"/></svg>`;
const moveUpIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`;
const moveDownIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></svg>`;
const widthIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8v8M21 8v8M8 5l-5 3 5 3M16 5l5 3-5 3"/></svg>`;
const heightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8M8 21h8M5 8l3-5 3 5M5 16l3 5 3-5"/></svg>`;
const ratioIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
const hDistIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6v12M21 6v12M6 9l2 3-2 3M12 9l2 3-2 3M18 9l2 3-2 3"/></svg>`;
const vDistIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M9 6l3 2 3-2M9 12l3 2 3-2M9 18l3 2 3-2"/></svg>`;
const selectAllIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>`;
const cutIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12l5.66 5.66"/></svg>`;
const copyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const pasteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`;
const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
const zoomInIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>`;
const zoomOutIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>`;
const formatClearIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7v13M15 7v13"/></svg>`;
const rotateResetIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`;
const chevronLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" class="relative z-10 h-4 w-4"><path fill="currentColor" d="M15.4 16.6L10.8 12l4.6-4.6L14 6l-6 6l6 6z"/></svg>`;
const chevronRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" class="relative z-10 h-4 w-4"><path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"/></svg>`;
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
  border-color: #1677ff;
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
.vtb-color {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 26px;
  cursor: pointer;
  border-radius: 4px;
  color: #444;
  flex: 0 0 auto;
}
.vtb-color.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.vtb-color:hover:not(.disabled) {
  background: #e6f4ff;
  color: #1677ff;
}
.vtb-color-swatch {
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 3px;
  border-radius: 1px;
}
.vtb-color input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: inherit;
}
.vtb-color.disabled input[type="color"] {
  pointer-events: none;
}
.rotate-90 {
  display: inline-block;
  transform: rotate(90deg);
}
</style>
