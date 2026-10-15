<!--
  TextQuickToolbar — 选中文本元素时浮在元素上方的字体/字号/对齐工具。

  位置策略(仿三方):
  - 通过 DOMRect 把 toolbar 锚在选中元素顶部
  - 元素贴近顶栏时(距离 < 64px),下挂到元素底部;
  - 否则默认挂到元素上方(transform: translateY(-100%))
  - Teleport 到 designer root(避免被父元素 overflow / transform 裁剪)
-->
<template>
  <Teleport v-if="visible" :to="teleportTarget">
    <div
      v-show="hasRect"
      class="tqt-host"
      :style="hostStyle"
      @mousedown.stop
      @click.stop
      @dblclick.stop
    >
      <div class="tqt-bar">
        <!-- 字体 -->
        <select
          class="tqt-select"
          :value="fontFamily ?? ''"
          :disabled="disabled"
          title="字体"
          @change="onFontFamily"
        >
          <optgroup v-for="g in fontGroups" :key="g.label" :label="g.label">
            <option v-for="o in g.options" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </optgroup>
        </select>

        <span class="tqt-sep" />

        <!-- 字号 -->
        <div class="tqt-group">
          <button
            class="tqt-step"
            :disabled="disabled"
            title="减小字号"
            @click="onFontSize(-1)"
          >
            −
          </button>
          <input
            class="tqt-num"
            :value="fontSize ?? ''"
            :disabled="disabled"
            min="1"
            max="200"
            title="字号"
            @change="onFontSizeInput"
          />
          <button
            class="tqt-step"
            :disabled="disabled"
            title="增大字号"
            @click="onFontSize(1)"
          >
            +
          </button>
        </div>

        <span class="tqt-sep" />

        <!-- 水平对齐 -->
        <button
          class="tqt-tb"
          :class="{ active: textAlign === 'left' }"
          :disabled="disabled"
          title="左对齐"
          @click="setTextAlign('left')"
        >
          <span v-html="alignLeftIcon" />
        </button>
        <button
          class="tqt-tb"
          :class="{ active: textAlign === 'center' }"
          :disabled="disabled"
          title="水平居中"
          @click="setTextAlign('center')"
        >
          <span v-html="alignCenterHIcon" />
        </button>
        <button
          class="tqt-tb"
          :class="{ active: textAlign === 'right' }"
          :disabled="disabled"
          title="右对齐"
          @click="setTextAlign('right')"
        >
          <span v-html="alignRightIcon" />
        </button>

        <span class="tqt-sep" />

        <!-- 垂直对齐(图标旋转 90deg) -->
        <button
          class="tqt-tb"
          :class="{ active: verticalAlign === 'top' }"
          :disabled="disabled"
          title="顶对齐"
          @click="setVerticalAlign('top')"
        >
          <span class="rotate-90" v-html="alignLeftIcon" />
        </button>
        <button
          class="tqt-tb"
          :class="{ active: verticalAlign === 'middle' }"
          :disabled="disabled"
          title="垂直居中"
          @click="setVerticalAlign('middle')"
        >
          <span class="rotate-90" v-html="alignCenterHIcon" />
        </button>
        <button
          class="tqt-tb"
          :class="{ active: verticalAlign === 'bottom' }"
          :disabled="disabled"
          title="底对齐"
          @click="setVerticalAlign('bottom')"
        >
          <span class="rotate-90" v-html="alignRightIcon" />
        </button>

        <span class="tqt-sep" />

        <!-- B / I / U / 竖排 -->
        <button
          class="tqt-tb"
          :class="{ active: boldActive }"
          :disabled="disabled"
          title="粗体"
          @click="toggleBold"
        >
          <b>B</b>
        </button>
        <button
          class="tqt-tb"
          :class="{ active: italicActive }"
          :disabled="disabled"
          title="斜体"
          @click="toggleItalic"
        >
          <i>I</i>
        </button>
        <button
          class="tqt-tb"
          :class="{ active: underlineActive }"
          :disabled="disabled"
          title="下划线"
          @click="toggleUnderline"
        >
          <u>U</u>
        </button>
        <button
          class="tqt-tb"
          :class="{ active: isVertical }"
          :disabled="disabled"
          title="竖排文本"
          @click="toggleVertical"
        >
          <span v-html="verticalTextIcon" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Ref,
} from "vue";
import type { TextElement } from "../../core/types";
import { FONT_FAMILY_GROUPS } from "../../etypes/base";

const fontGroups = FONT_FAMILY_GROUPS;

const props = defineProps<{
  /** 当前选中的文本元素(必须 type === 'text') */
  element: El | null;
  /** 是否禁用(只读 / 锁定) */
  disabled?: boolean;
  /** designer root(provide/inject 注入) */
}>();

const emit = defineEmits<{
  /** patch 文本元素风格字段 */
  patch: [patch: Partial<TextElement>];
}>();

// 注入 designer root(PrintDesigner 注入)
const designerRoot = inject<Ref<HTMLElement | null>>(
  "designer-root",
  ref(null),
);

// Teleport 目标:designer root(优先)/ body(兜底)
const teleportTarget = computed(() => designerRoot.value ?? "body");

// 浮层 anchor rect(实时跟随元素 DOMRect)
const anchorRect = ref<DOMRect | null>(null);
const hasRect = computed(() => !!anchorRect.value);
const visible = computed(() => !!props.element && !!anchorRect.value);

function updateAnchorRect() {
  const el = props.element;
  if (!el) {
    anchorRect.value = null;
    return;
  }
  // 直接查 .canvas-element.selected(DesignerCanvas 内被选中的元素节点)
  const dom = document.querySelector(".canvas-element.selected");
  if (!dom) {
    anchorRect.value = null;
    return;
  }
  anchorRect.value = dom.getBoundingClientRect();
}

let rafId: number | null = null;
function loopUpdate() {
  updateAnchorRect();
  rafId = requestAnimationFrame(loopUpdate);
}

onMounted(() => {
  nextTick(updateAnchorRect);
  rafId = requestAnimationFrame(loopUpdate);
});
onBeforeUnmount(() => {
  if (rafId != null) cancelAnimationFrame(rafId);
});

watch(
  () => props.element?.id,
  () => nextTick(updateAnchorRect),
);

const hostStyle = computed(() => {
  const rect = anchorRect.value;
  if (!rect) return { display: "none" } as Record<string, string>;
  // 元素贴近顶部(< 64px 顶部空间)时下挂到元素底部
  const underTop = rect.top < 64;
  const top = underTop ? rect.bottom + 8 : Math.max(8, rect.top - 8);
  return {
    display: "block",
    position: "fixed",
    left: `${rect.left}px`,
    top: `${top}px`,
    transform: underTop ? "none" : "translateY(-100%)",
    transformOrigin: underTop ? "left top" : "left bottom",
  } as Record<string, string>;
});

const fontFamily = computed(
  () => (props.element as TextElement | null)?.fontFamily ?? "",
);
const fontSize = computed(
  () => (props.element as TextElement | null)?.fontSize ?? null,
);
const textAlign = computed(
  () => (props.element as TextElement | null)?.align ?? "",
);
const verticalAlign = computed(
  () => (props.element as TextElement | null)?.verticalAlign ?? "",
);
const boldActive = computed(() => {
  const fw = (props.element as TextElement | null)?.fontWeight;
  return fw === "bold" || fw === "700" || fw === "900";
});
const italicActive = computed(
  () => (props.element as TextElement | null)?.fontStyle === "italic",
);
const underlineActive = computed(
  () => (props.element as TextElement | null)?.textDecoration === "underline",
);
const writingMode = computed(
  () =>
    (props.element as TextElement | null)?.writingMode ?? "horizontal-tb",
);
const isVertical = computed(() => writingMode.value !== "horizontal-tb");

function setTextAlign(family: "left" | "center" | "right") {
  emit("patch", { align: textAlign.value === family ? "left" : family });
}
function setVerticalAlign(mode: "top" | "middle" | "bottom") {
  emit("patch", { verticalAlign: verticalAlign.value === mode ? "top" : mode });
}
function toggleBold() {
  emit("patch", { fontWeight: boldActive.value ? "normal" : "bold" });
}
function toggleItalic() {
  emit("patch", { fontStyle: italicActive.value ? "normal" : "italic" });
}
function toggleUnderline() {
  emit("patch", {
    textDecoration: underlineActive.value ? "none" : "underline",
  });
}
function toggleVertical() {
  emit("patch", {
    writingMode:
      writingMode.value === "horizontal-tb" ? "vertical-lr" : "horizontal-tb",
  });
}

function onFontFamily(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  emit("patch", { fontFamily: v || undefined });
}

function onFontSize(delta: number) {
  if (!fontSize.value) return;
  const next = Math.max(1, Math.min(200, fontSize.value + delta));
  emit("patch", { fontSize: next });
}
function onFontSizeInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(v) && v > 0) {
    emit("patch", { fontSize: Math.max(1, Math.min(200, v)) });
  }
}

// ===== icons(同步三方 inline svg) =====
const stroke = "currentColor";
const sw = 1.5;
const alignLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`;
const alignCenterHIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
const alignRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>`;
const verticalTextIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6v12M5 8l2-2 2 2M5 16l2 2 2-2M17 6v12M15 8l2-2 2 2M15 16l2 2 2-2"/></svg>`;
</script>

<style scoped>
.tqt-host {
  z-index: 60;
  pointer-events: auto;
}
.tqt-bar {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  border: 1px solid #e8e8e8;
  color: #444;
  white-space: nowrap;
  font-feature-settings: "tnum";
}
.tqt-select {
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  outline: none;
  min-width: 100px;
  color: inherit;
}
.tqt-select:hover,
.tqt-select:focus {
  border-color: #91caff;
  background: #fff;
}
.tqt-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.tqt-group {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}
.tqt-step,
.tqt-tb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 26px;
  padding: 0 4px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  transition:
    background 120ms,
    border-color 120ms,
    color 120ms;
}
.tqt-tb :deep(.anticon) {
  font-size: 16px;
  line-height: 1;
}
.tqt-tb :deep(svg) {
  /* inline SVG 默认 vertical-align: baseline,会跟 inline-flex 居中冲突,
   * 显示偏上 ~3px;改 block 让 flex 容器按几何中心对齐 */
  display: block;
}
.tqt-step:hover:not(:disabled),
.tqt-tb:hover:not(:disabled) {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.tqt-tb.active {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #1677ff;
}
.tqt-step:disabled,
.tqt-tb:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.tqt-num {
  width: 44px;
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  text-align: center;
  outline: none;
  color: inherit;
}
.tqt-num:hover:not(:disabled),
.tqt-num:focus {
  border-color: #1677ff;
  background: #fff;
}
.tqt-num:disabled {
  background: transparent;
  color: #bfbfbf;
  cursor: not-allowed;
}
.tqt-sep {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: #d9d9d9;
  margin: 0 4px;
  flex: 0 0 auto;
}
.rotate-90 {
  display: inline-block;
  transform: rotate(90deg);
}
</style>
