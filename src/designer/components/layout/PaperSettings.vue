<!--
  Paper Settings — 头部工具栏的纸张设置入口。

  视觉参考三方设计器:浅灰胶囊容器里放一个 settings 齿轮图标 + 当前纸张名
  + chevron-down 箭头,点击弹出下拉面板。

  面板功能(本期):
  - 纸张大小预设(A4 / A5 / A3 / Letter / 自定义)
  - 宽 × 高(mm)
  - 画布背景色(ColorPicker + 棋盘格视觉)
  - 网格显示开关

  数据流:单向 prop(状态镜像)+ emit 一一列举。给 HeaderToolbar 调用,store
  操作由 PrintDesigner 上游处理。
-->
<template>
  <div class="ps-wrap" ref="wrapRef">
    <button
      type="button"
      class="ps-trigger"
      :class="{ 'is-open': isOpen }"
      title="纸张设置"
      @click="toggleOpen"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" class="ps-icon">
        <path
          fill="currentColor"
          d="M11 22.5v-3h2v3zm-7-1.5v-2h16v2zM4 18q-.825 0-1.412-.587T2 16V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v10q0 .825-.587 1.413T20 18zm0-2h16V8H4z"
        />
      </svg>
      <span class="ps-label">{{ currentLabel }}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" class="ps-icon">
        <path
          fill="currentColor"
          d="M7.4 8.6L12 13.2l4.6-4.6L18 10l-6 6l-6-6z"
        />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="ps-backdrop"
        @click="isOpen = false"
      />
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="ps-dropdown"
        :style="dropdownStyle"
        @click.stop
      >
        <div class="ps-section-title">纸张大小</div>
        <div class="ps-presets">
          <button
            v-for="opt in PRESETS"
            :key="opt.key"
            type="button"
            class="ps-preset-btn"
            :class="{ 'is-active': opt.key === selectedKey }"
            @click="onPresetPick(opt.key)"
          >
            <span class="ps-preset-key">{{ opt.key }}</span>
            <span class="ps-preset-size">{{ opt.width }}×{{ opt.height }}mm</span>
          </button>
        </div>

        <div class="ps-grid-2">
          <div class="ps-field">
            <label class="ps-field-label">宽 (mm)</label>
            <input
              type="number"
              class="ps-input"
              min="1"
              :value="customWidth"
              @input="onCustomWidthInput(($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="ps-field">
            <label class="ps-field-label">高 (mm)</label>
            <input
              type="number"
              class="ps-input"
              min="1"
              :value="customHeight"
              @input="onCustomHeightInput(($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <div class="ps-section-title">画布背景</div>
        <div class="ps-bg-row">
          <ColorPicker
            :model-value="canvasBackground"
            :allow-transparent="true"
            @update:model-value="onBgColorChange"
          >
            <template #trigger="{ onClick, onMousedown }">
              <button
                type="button"
                class="ps-bg-swatch"
                title="画布背景色"
                @click="onClick"
                @mousedown="onMousedown"
              >
                <span class="ps-swatch-checker" />
                <span
                  class="ps-swatch-fill"
                  :style="{ backgroundColor: canvasBackground || 'transparent' }"
                />
                <span
                  v-if="canvasBackground === 'transparent'"
                  class="ps-swatch-strike"
                />
              </button>
            </template>
          </ColorPicker>
          <button
            v-if="canvasBackground !== 'transparent'"
            type="button"
            class="ps-link-btn"
            @click="$emit('setCanvasBackground', 'transparent')"
          >
            透明
          </button>
          <button
            v-else
            type="button"
            class="ps-link-btn"
            @click="$emit('setCanvasBackground', '#ffffff')"
          >
            白色
          </button>
        </div>

        <div class="ps-toggle-row">
          <span class="ps-toggle-label">显示网格</span>
          <button
            type="button"
            class="ps-switch"
            :class="{ 'is-on': showGrid }"
            @click="$emit('toggleGrid')"
            :aria-pressed="showGrid"
          >
            <span class="ps-switch-thumb" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ColorPicker from "../common/ColorPicker.vue";

interface PresetOption {
  key: string;
  label: string;
  width: number;
  height: number;
}

const PRESETS: PresetOption[] = [
  { key: "A4", label: "A4 (210×297mm)", width: 210, height: 297 },
  { key: "A5", label: "A5 (148×210mm)", width: 148, height: 210 },
  { key: "A3", label: "A3 (297×420mm)", width: 297, height: 420 },
  { key: "Letter", label: "Letter (216×279mm)", width: 216, height: 279 },
];

const props = defineProps<{
  /** 当前 paper 宽 (mm) */
  paperWidth: number;
  /** 当前 paper 高 (mm) */
  paperHeight: number;
  /** 画布背景色 */
  canvasBackground: string;
  /** 是否显示网格 */
  showGrid: boolean;
}>();

const emit = defineEmits<{
  setPaper: [paper: { width: number; height: number }];
  setCanvasBackground: [color: string];
  toggleGrid: [];
}>();

const isOpen = ref(false);
const wrapRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({ top: "0", left: "0" });

const customWidth = ref(props.paperWidth);
const customHeight = ref(props.paperHeight);

watch(
  () => [props.paperWidth, props.paperHeight] as const,
  ([w, h]) => {
    customWidth.value = w;
    customHeight.value = h;
  },
);

const selectedKey = computed(() => {
  const match = PRESETS.find(
    (p) => p.width === props.paperWidth && p.height === props.paperHeight,
  );
  return match?.key ?? "Custom";
});

const currentLabel = computed(() => {
  const match = PRESETS.find(
    (p) => p.width === props.paperWidth && p.height === props.paperHeight,
  );
  return match ? match.key : `${props.paperWidth}×${props.paperHeight}`;
});

function toggleOpen() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(updatePosition);
  }
}

function updatePosition() {
  const trigger = wrapRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const dw = 280;
  const dh = 380;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const style: Record<string, string> = { position: "fixed" };
  style.left = rect.left + dw <= screenW - 8 ? `${rect.left}px` : `${Math.max(8, rect.right - dw)}px`;
  style.top = rect.bottom + dh <= screenH - 8 ? `${rect.bottom + 6}px` : `${Math.max(8, rect.top - dh - 6)}px`;
  dropdownStyle.value = style;
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return;
  const target = e.target as Node | null;
  if (!target) return;
  if (wrapRef.value?.contains(target)) return;
  if (dropdownRef.value?.contains(target)) return;
  isOpen.value = false;
}

function onPresetPick(key: string) {
  const opt = PRESETS.find((p) => p.key === key);
  if (!opt) return;
  customWidth.value = opt.width;
  customHeight.value = opt.height;
  emit("setPaper", { width: opt.width, height: opt.height });
}

function onCustomWidthInput(raw: string) {
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0) return;
  customWidth.value = v;
  emit("setPaper", { width: v, height: customHeight.value });
}

function onCustomHeightInput(raw: string) {
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0) return;
  customHeight.value = v;
  emit("setPaper", { width: customWidth.value, height: v });
}

function onBgColorChange(color: string | undefined) {
  emit("setCanvasBackground", color ?? "#ffffff");
}

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
  window.addEventListener("resize", () => isOpen.value && updatePosition());
  window.addEventListener("scroll", () => isOpen.value && updatePosition(), true);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<style scoped>
.ps-wrap {
  position: relative;
  display: inline-block;
}
.ps-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  color: #444;
  cursor: pointer;
  transition:
    background 120ms,
    border-color 120ms,
    color 120ms;
  flex: 0 0 auto;
  font-size: 12px;
}
.ps-trigger:hover {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.ps-trigger.is-open {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #1677ff;
}
.ps-icon {
  display: block;
}
.ps-label {
  white-space: nowrap;
}
.ps-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100000;
}
.ps-dropdown {
  position: fixed;
  z-index: 100001;
  width: 280px;
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  padding: 12px;
  font-size: 12px;
  user-select: none;
}
.ps-section-title {
  font-weight: 500;
  margin: 8px 0 6px;
  color: #555;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ps-section-title:first-child {
  margin-top: 0;
}
.ps-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}
.ps-preset-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition:
    background 120ms,
    border-color 120ms,
    color 120ms;
}
.ps-preset-btn:hover {
  background: #e6f4ff;
  border-color: #91caff;
}
.ps-preset-btn.is-active {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #1677ff;
}
.ps-preset-key {
  font-size: 12px;
  font-weight: 500;
}
.ps-preset-size {
  font-size: 11px;
  color: #8c8c8c;
}
.ps-preset-btn.is-active .ps-preset-size {
  color: #1677ff;
}
.ps-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.ps-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ps-field-label {
  font-size: 11px;
  color: #8c8c8c;
}
.ps-input {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  font-size: 12px;
  outline: none;
  transition: border-color 120ms;
}
.ps-input:focus {
  border-color: #1677ff;
}
.ps-bg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.ps-bg-swatch {
  position: relative;
  width: 36px;
  height: 24px;
  padding: 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  background: white;
  flex: 0 0 auto;
}
.ps-bg-swatch:hover {
  border-color: #1677ff;
}
.ps-swatch-checker {
  position: absolute;
  inset: 0;
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwZ+5wNisxL//8n04mEeRAAAhNwX869V4DYAAAAASUVORK5CYII=");
  background-repeat: repeat;
  background-size: 6px 6px;
  opacity: 0.5;
}
.ps-swatch-fill {
  position: absolute;
  inset: 0;
}
.ps-swatch-strike {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.ps-swatch-strike::before {
  content: "";
  width: 100%;
  height: 1px;
  background: #ff4d4f;
  transform: rotate(-45deg) scale(1.5);
}
.ps-link-btn {
  padding: 2px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms, color 120ms, border-color 120ms;
}
.ps-link-btn:hover {
  background: #f5f5f5;
  color: #1677ff;
  border-color: #1677ff;
}
.ps-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
.ps-toggle-label {
  color: #444;
  font-size: 12px;
}
.ps-switch {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 999px;
  border: none;
  background: #d9d9d9;
  cursor: pointer;
  transition: background 120ms;
  flex: 0 0 auto;
  padding: 0;
}
.ps-switch.is-on {
  background: #1677ff;
}
.ps-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: left 120ms;
}
.ps-switch.is-on .ps-switch-thumb {
  left: 16px;
}
</style>