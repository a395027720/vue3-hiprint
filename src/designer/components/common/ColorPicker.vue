<template>
  <div ref="containerRef" class="cp-container">
    <!-- 触发器:可由外部用 #trigger 插槽自定义(HeaderToolbar 用图标+色块);
         不传插槽时使用默认 cp-trigger 色块(供 PropertyPanel 使用)。 -->
    <slot
      name="trigger"
      :is-open="isOpen"
      :disabled="disabled"
      :on-click="handleTriggerClick"
      :on-mousedown="stopMousedown"
    >
      <div
        class="cp-trigger"
        :class="{ 'is-disabled': disabled, 'is-open': isOpen, 'is-empty': !modelValue }"
        :style="{ backgroundColor: triggerBg }"
        @click="handleTriggerClick"
        @mousedown.stop
      >
        <!-- 空值 / transparent 的斜线标记 -->
        <div v-if="!modelValue && !hideEmptyStrike" class="cp-strike" />
        <div v-if="isTransparent" class="cp-transparent-bg" />
      </div>
    </slot>

    <!-- 下拉面板(Teleport 到 body 避免被父级 overflow 裁剪) -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="cp-dropdown"
        :style="dropdownStyle"
        @click.stop
        @mousedown.stop
      >
        <!-- 饱和度/明度面板 -->
        <div
          ref="svPanelRef"
          class="cp-sv-panel"
          :style="svPanelStyle"
          @mousedown.stop="(e) => handleDrag(e, 'sv')"
        >
          <div class="cp-sv-white" />
          <div class="cp-sv-black" />
          <div class="cp-sv-cursor" :style="cursorStyle" />
        </div>

        <!-- 滑块 + 预览 -->
        <div class="cp-sliders">
          <div class="cp-slider-col">
            <!-- Hue 滑块 -->
            <div
              ref="hueSliderRef"
              class="cp-hue-slider"
              @mousedown.stop="(e) => handleDrag(e, 'hue')"
            >
              <div class="cp-hue-cursor" :style="hueCursorStyle" />
            </div>
            <!-- Alpha 滑块 -->
            <div class="cp-alpha-wrap">
              <div
                ref="alphaSliderRef"
                class="cp-alpha-slider"
                :style="alphaBackgroundStyle"
                @mousedown.stop="(e) => handleDrag(e, 'alpha')"
              >
                <div class="cp-alpha-cursor" :style="alphaCursorStyle" />
              </div>
            </div>
          </div>
          <!-- 颜色预览 -->
          <div class="cp-preview">
            <div class="cp-transparent-bg" />
            <div class="cp-preview-color" :style="{ backgroundColor: rgbaValue }" />
            <div v-if="hsv.a === 0" class="cp-strike" />
          </div>
        </div>

        <!-- Hex 输入 + Alpha 百分比 -->
        <div class="cp-input-row">
          <input
            v-model="hexValue"
            type="text"
            class="cp-hex-input"
            placeholder="#000000"
          />
          <div class="cp-alpha-text">{{ Math.round(hsv.a * 100) }}%</div>
        </div>

        <!-- 预设色板 -->
        <div class="cp-presets">
          <div
            v-for="color in PRESET_COLORS"
            :key="color"
            class="cp-preset-cell"
            :class="{ 'is-active': hexValue === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectPreset(color)"
          />
        </div>

        <!-- 底部操作 -->
        <div class="cp-footer">
          <button class="cp-btn cp-btn-clear" @click="clearColor">清除</button>
          <button
            v-if="allowTransparent"
            class="cp-btn cp-btn-transparent"
            @click="setTransparent"
          >
            透明
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { hsvToRgb, parseColor, toHex, type HSVA } from "../../utils/color";

const props = defineProps<{
  /** 颜色字符串(#rrggbb / #rrggbbaa / rgba / transparent);空 = 未设置 */
  modelValue?: string;
  disabled?: boolean;
  defaultColor?: string;
  allowTransparent?: boolean;
  /** 空值时不画黑斜线(背景色等"空=透明"语义的字段用,避免误以为"未设置") */
  hideEmptyStrike?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | undefined];
}>();

// ===== 状态 =====
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const hsv = ref<HSVA>({ h: 0, s: 0, v: 0, a: 1 });
const svPanelRef = ref<HTMLElement | null>(null);
const hueSliderRef = ref<HTMLElement | null>(null);
const alphaSliderRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({ top: "0", left: "0" });

const isTransparent = computed(() => props.modelValue === "transparent");

const displayColor = computed(() => {
  if (!props.modelValue) return props.defaultColor || "#000000";
  if (isTransparent.value) return "transparent";
  return props.modelValue;
});

/** trigger 背景色:空值用白底(配合黑斜线表示"未设置颜色"),与 macOS ColorPicker 一致 */
const triggerBg = computed(() => {
  if (isTransparent.value) return "transparent";
  if (!props.modelValue) return "#ffffff";
  return props.modelValue;
});

const rgbaValue = computed(() => {
  const { r, g, b } = hsvToRgb(hsv.value.h, hsv.value.s, hsv.value.v);
  return `rgba(${r}, ${g}, ${b}, ${parseFloat(hsv.value.a.toFixed(2))})`;
});

// ===== 双向:HSV ↔ Hex =====
const hexValue = computed({
  get: () => toHex(hsv.value.h, hsv.value.s, hsv.value.v, hsv.value.a),
  set: (val: string) => {
    const parsed = parseColor(val);
    if (parsed) {
      hsv.value = parsed;
      emitUpdate();
    }
  },
});

// ===== 样式 computed =====
const svPanelStyle = computed(() => ({
  backgroundColor: `hsl(${hsv.value.h}, 100%, 50%)`,
}));
const cursorStyle = computed(() => ({
  top: `${(1 - hsv.value.v) * 100}%`,
  left: `${hsv.value.s * 100}%`,
}));
const hueCursorStyle = computed(() => ({
  left: `${(hsv.value.h / 360) * 100}%`,
}));
const alphaCursorStyle = computed(() => ({
  left: `${hsv.value.a * 100}%`,
}));
const alphaBackgroundStyle = computed(() => {
  const { r, g, b } = hsvToRgb(hsv.value.h, hsv.value.s, hsv.value.v);
  return {
    background: `linear-gradient(to right, rgba(${r},${g},${b},0) 0%, rgba(${r},${g},${b},1) 100%)`,
  };
});

// ===== 初始化 / 同步 =====
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      const parsed = parseColor(val);
      if (parsed) hsv.value = parsed;
    }
  },
  { immediate: true },
);

// ===== 拖拽 =====
function handleDrag(e: MouseEvent, type: "sv" | "hue" | "alpha") {
  e.preventDefault();
  const el =
    type === "sv"
      ? svPanelRef.value
      : type === "hue"
        ? hueSliderRef.value
        : alphaSliderRef.value;
  if (!el) return;

  const update = (clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();
    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    if (type === "sv") {
      hsv.value.s = x;
      hsv.value.v = 1 - y;
      if (hsv.value.a === 0) hsv.value.a = 1;
    } else if (type === "hue") {
      hsv.value.h = x * 360;
      if (hsv.value.a === 0) hsv.value.a = 1;
    } else if (type === "alpha") {
      hsv.value.a = x;
    }
    emitUpdate();
  };
  update(e.clientX, e.clientY);

  const onMove = (ev: MouseEvent) => update(ev.clientX, ev.clientY);
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function emitUpdate() {
  if (hsv.value.a === 0 && props.allowTransparent) {
    emit("update:modelValue", "transparent");
  } else {
    emit(
      "update:modelValue",
      toHex(hsv.value.h, hsv.value.s, hsv.value.v, hsv.value.a),
    );
  }
}

// ===== 定位 dropdown =====
function updatePosition() {
  const trigger = containerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const dw = 240;
  const dh = 350;
  const style: Record<string, string> = { position: "fixed" };
  // 左右:左边放不下就靠右对齐
  style.left = rect.left + dw <= screenW - 8 ? `${rect.left}px` : `${Math.max(8, rect.right - dw)}px`;
  // 上下:下面放不下就往上
  style.top = rect.bottom + dh <= screenH - 8 ? `${rect.bottom + 6}px` : `${Math.max(8, rect.top - dh - 6)}px`;
  dropdownStyle.value = style;
}

// ===== 外部点击关闭 =====
function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return;
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const container = containerRef.value;
  if (!container) return;
  // 自定义 trigger 时,整个 cp-container 内部都算"内部点击",统一用 containerRef.contains 判定
  const inContainer = container.contains(target);
  const inDropdown = !!target.closest(".cp-dropdown");
  if (!inContainer && !inDropdown) isOpen.value = false;
}

function handleTriggerClick(e: MouseEvent) {
  if (props.disabled) return;
  e.stopPropagation();
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(updatePosition);
  }
}

/** 暴露给自定义 trigger 插槽的 mousedown 处理器(防止画布/父级误判 mousedown 开始) */
function stopMousedown(e: MouseEvent) {
  e.stopPropagation();
}

function clearColor() {
  emit("update:modelValue", undefined);
  isOpen.value = false;
}
function setTransparent() {
  emit("update:modelValue", "transparent");
  isOpen.value = false;
}

// 滚动 / resize 时重算位置
watch(isOpen, (val) => {
  if (val) {
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
  } else {
    window.removeEventListener("scroll", updatePosition, true);
    window.removeEventListener("resize", updatePosition);
  }
});

// ===== 预设色板(常用 27 色) =====
const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#00ffff",
  "#ff00ff",
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#9e9e9e",
  "#607d8b",
];
function selectPreset(color: string) {
  const parsed = parseColor(color);
  if (parsed) {
    hsv.value = parsed;
    emitUpdate();
  }
}

onMounted(() => {
  // capture 阶段监听:HeaderToolbar 的自定义 trigger 用 @mousedown.stopPropagation
  // 阻止冒泡,普通冒泡阶段收不到;capture 在 stopPropagation 之前触发
  document.addEventListener("mousedown", handleClickOutside, true);
});
onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside, true);
  window.removeEventListener("scroll", updatePosition, true);
  window.removeEventListener("resize", updatePosition);
});
</script>

<style scoped>
.cp-container {
  position: relative;
  display: inline-block;
}

.cp-trigger {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 120ms;
}
.cp-trigger:hover:not(.is-disabled) {
  border-color: #1890ff;
}
.cp-trigger.is-open {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
.cp-trigger.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 斜线(空值 / transparent) */
.cp-strike {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.cp-strike::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #000000;
  transform: rotate(-45deg);
  transform-origin: center;
}
/* 透明棋盘格背景 */
.cp-transparent-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  opacity: 0.5;
}

/* dropdown */
.cp-dropdown {
  position: fixed;
  z-index: 100000;
  width: 240px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  padding: 12px;
  pointer-events: auto;
  font-size: 12px;
  user-select: none;
}

/* SV 面板 */
.cp-sv-panel {
  width: 100%;
  height: 128px;
  border-radius: 4px;
  position: relative;
  cursor: crosshair;
  margin-bottom: 12px;
}
.cp-sv-white {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: linear-gradient(to right, #fff, transparent);
}
.cp-sv-black {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: linear-gradient(to top, #000, transparent);
}
.cp-sv-cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 滑块行 */
.cp-sliders {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.cp-slider-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cp-hue-slider {
  height: 12px;
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  background: linear-gradient(
    to right,
    #f00 0%,
    #ff0 17%,
    #0f0 33%,
    #0ff 50%,
    #00f 67%,
    #f0f 83%,
    #f00 100%
  );
}
.cp-hue-cursor {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}
.cp-alpha-wrap {
  position: relative;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
}
.cp-alpha-slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  border-radius: 2px;
}
.cp-alpha-cursor {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

/* 颜色预览 */
.cp-preview {
  position: relative;
  width: 32px;
  height: 32px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.cp-preview-color {
  position: absolute;
  inset: 0;
}

/* 输入行 */
.cp-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
.cp-hex-input {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  outline: none;
}
.cp-hex-input:focus {
  border-color: #1890ff;
}
.cp-alpha-text {
  width: 48px;
  text-align: right;
  color: #8c8c8c;
}

/* 预设 */
.cp-presets {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 4px;
  margin-bottom: 12px;
}
.cp-preset-cell {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 120ms, border-color 120ms;
}
.cp-preset-cell:hover {
  transform: scale(1.15);
  border-color: #8c8c8c;
}
.cp-preset-cell.is-active {
  border-color: #1890ff;
  box-shadow: 0 0 0 1px #1890ff;
}

/* 底部操作 */
.cp-footer {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}
.cp-btn {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: color 120ms, background 120ms;
}
.cp-btn-clear {
  color: #ff4d4f;
}
.cp-btn-clear:hover {
  color: #cf1322;
  background: #fff1f0;
}
.cp-btn-transparent {
  color: #595959;
}
.cp-btn-transparent:hover {
  color: #262626;
  background: #f5f5f5;
}
</style>
