<!--
  顶栏(品牌 + 保存按钮 + 箭头菜单)。
  元素按钮已搬到 ElementsPanel(左侧浮层),顶栏不放元素。
  保存箭头菜单按三方库习惯:Save As / Preview / Print / Export PDF / Export HTML / Export Images / 分隔 / Toolbar Reorder / Help / Settings。
-->
<template>
  <header class="topbar">
    <div class="brand">
      <printer-outlined class="brand-icon" />
      <h1 class="brand-title">打印设计器</h1>
    </div>

    <div class="middle">
      <!-- 顶栏水平元素按钮条(S5):点击 / 拖拽到画布,与左侧 ElementsPanel 共用 palette 数据 -->
      <HeaderElementsBar
        :custom-elements="props.customElements ?? []"
        @add="(type, pageIndex, position, payload) => $emit('add', type, pageIndex, position, payload)"
      />
    </div>

    <div class="actions">
      <div ref="saveMenuRef" class="save-group">
        <button
          class="save-btn"
          :class="{ 'is-disabled': !dirty }"
          @click="handleClick"
        >
          <save-outlined />
          <span class="save-label">保存</span>
        </button>
        <button class="save-arrow" title="更多保存操作" @click="toggleSaveMenu">
          <down-outlined />
        </button>
        <div v-if="saveMenuOpen" class="save-menu">
          <button class="save-menu-item" @click="onPick('saveAs')">
            <save-outlined /> 另存为模板
          </button>
          <button class="save-menu-item" @click="onPick('preview')">
            <eye-outlined /> 打印预览
          </button>
          <button class="save-menu-item" @click="onPick('print')">
            <printer-outlined /> 打印
          </button>
          <button class="save-menu-item" @click="onPick('exportPdf')">
            <file-pdf-outlined /> 导出 PDF
          </button>
          <button class="save-menu-item" @click="onPick('exportHtml')">
            <file-text-outlined /> 导出 HTML
          </button>
          <button class="save-menu-item" @click="onPick('exportImages')">
            <picture-outlined /> 导出图片
          </button>
          <div class="save-menu-sep" />
          <button class="save-menu-item" @click="onPick('toolbarReorder')">
            <drag-outlined /> 工具条重排
          </button>
          <button class="save-menu-item" @click="onPick('help')">
            <question-circle-outlined /> 帮助
          </button>
          <button class="save-menu-item" @click="onPick('settings')">
            <setting-outlined /> 设置
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { Element, ElementType } from "../../core/types";
import type { CustomElementTemplate } from "../../api/useDesigner";
import HeaderElementsBar from "./HeaderElementsBar.vue";

const props = defineProps<{
  /** 当前模板是否有未保存修改(决定保存按钮是否可用) */
  dirty?: boolean;
  /** 自定义元素列表(PrintDesigner 透传,接 useDesigner.customElements) */
  customElements?: CustomElementTemplate[];
}>();

const emit = defineEmits<{
  save: [];
  saveAs: [];
  preview: [];
  print: [];
  exportPdf: [];
  exportHtml: [];
  exportImages: [];
  toolbarReorder: [];
  help: [];
  settings: [];
  /** HeaderElementsBar 触发的新增元素(透传到 PrintDesigner.onAdd) */
  add: [
    type: ElementType,
    pageIndex?: number,
    position?: { x: number; y: number },
    payload?: Partial<Element>,
  ];
}>();

const saveMenuOpen = ref(false);
const saveMenuRef = ref<HTMLElement | null>(null);

type SaveAction =
  | "saveAs"
  | "preview"
  | "print"
  | "exportPdf"
  | "exportHtml"
  | "exportImages"
  | "toolbarReorder"
  | "help"
  | "settings";

const handleClick = () => {
  if (!props.dirty) return;
  emit("save");
};

function onPick(action: SaveAction) {
  saveMenuOpen.value = false;
  emit(action);
}

function toggleSaveMenu() {
  saveMenuOpen.value = !saveMenuOpen.value;
}

function onDocumentMouseDown(e: MouseEvent) {
  if (!saveMenuOpen.value) return;
  if (saveMenuRef.value && !saveMenuRef.value.contains(e.target as Node)) {
    saveMenuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("mousedown", onDocumentMouseDown));
onBeforeUnmount(() =>
  document.removeEventListener("mousedown", onDocumentMouseDown),
);
</script>

<style scoped>
.topbar {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) minmax(0, clamp(360px, 58vw, 860px))
    minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex: 0 0 auto;
  position: relative;
  z-index: 45; /* 高于 TextQuickToolbar(30)+ HeaderToolbar(40),确保覆盖 */
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  justify-self: start;
}
.brand-icon {
  font-size: 20px;
  color: #1677ff;
}
.brand-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.middle {
  display: flex;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
}
.actions {
  display: flex;
  justify-self: end;
  position: relative;
  min-width: max-content;
}
.save-group {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #1677ff;
  border: 0;
  border-right: 1px solid #4096ff;
  border-radius: 6px 0 0 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 120ms;
  flex-shrink: 0;
}
.save-btn:hover:not(:disabled) {
  background: #4096ff;
}

.save-btn.is-disabled {
  cursor: not-allowed;
}

.save-label {
  white-space: nowrap;
}
.save-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  padding: 0 6px;
  background: #1677ff;
  border: 0;
  border-radius: 0 6px 6px 0;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 120ms;
  flex-shrink: 0;
}
.save-arrow:hover:not(:disabled) {
  background: #4096ff;
}
.save-arrow:disabled {
  background: #f0f0f0;
  border-radius: 0 6px 6px 0;
  color: #bfbfbf;
  cursor: not-allowed;
}
.save-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  padding: 4px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.save-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #333;
  background: transparent;
  border: 0;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  width: 100%;
  white-space: nowrap;
}
.save-menu-item:hover {
  background: #f5f5f5;
  color: #1677ff;
}
.save-menu-sep {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}
</style>
