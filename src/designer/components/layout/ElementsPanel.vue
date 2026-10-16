<!--
  ElementsPanel — 左侧元素面板(S5 v2)。

  与之前 v1(MVP)的差异:
  - 顶部加 标题 + 副标题 + 关闭按钮
  - 卡片变大(图标 16→28,padding 6→12,卡片高度 56→80,2 列布局)
  - 完整 standard / custom tab;custom tab 支持 CRUD(右键弹 5 项菜单)
  - CRUD 走 InputModal / CodeEditorModal(已 Teleport 到 modal-container);
    删除走 floating/Modal.vue 二次确认(danger 红按钮)
  - 拖拽协议:application/x-designer-element 携带 JSON {type, payload},
    fallback text/plain;payload 会被 DesignerCanvas onDrop 识别并合并到 createElement
-->
<template>
  <aside class="elements-panel" :class="{ closed: !props.open }">
    <header class="ep-header-bar">
      <div class="ep-titles">
        <h2 class="ep-title">元素</h2>
        <p class="ep-subtitle">拖拽到画布</p>
      </div>
      <button
        class="ep-close"
        type="button"
        title="关闭"
        aria-label="关闭"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </header>

    <div class="ep-tabs">
      <button
        :class="['ep-tab', { active: activeTab === 'standard' }]"
        @click="activeTab = 'standard'"
      >标准</button>
      <button
        :class="['ep-tab', { active: activeTab === 'custom' }]"
        @click="activeTab = 'custom'"
      >自定义</button>
    </div>

    <div v-if="activeTab === 'standard'" class="ep-body">
      <div class="ep-search-row">
        <input v-model="search" type="text" class="ep-search" placeholder="搜索元素" />
        <button class="ep-fold" title="折叠" @click="emit('togglePanel')">
          <span class="fold-icon">‹</span>
        </button>
      </div>
      <section v-for="(group, gi) in filteredGroups" :key="groupLabels[gi]" class="ep-group">
        <h3 class="ep-group-title">{{ groupLabels[gi] }}</h3>
        <div class="ep-grid">
          <button
            v-for="it in group"
            :key="it.type"
            class="ep-item"
            :title="it.label"
            draggable="true"
            @dragstart="onStandardDragStart($event, it.type)"
          >
            <span class="ep-icon" v-html="it.icon" />
            <span class="ep-label">{{ it.label }}</span>
          </button>
        </div>
      </section>
    </div>

    <div v-else-if="activeTab === 'custom'" class="ep-body">
      <div v-if="customElements.length === 0" class="ep-empty">暂无自定义元素</div>
      <div v-else class="ep-grid ep-grid-wide">
        <div
          v-for="t in customElements"
          :key="t.id"
          class="ep-item ep-item-custom"
          draggable="true"
          :title="t.name"
          @dragstart="onCustomDragStart($event, t)"
          @contextmenu.prevent="openMenu($event, t.id)"
        >
          <span class="ep-icon" v-html="customIcon(t)" />
          <span class="ep-label">{{ t.name }}</span>
          <button
            class="ep-more"
            type="button"
            title="更多"
            @click.stop="openMenu($event, t.id)"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 右键菜单浮层 -->
    <Teleport :to="teleportTo">
      <div
        v-if="activeMenuId"
        class="ep-menu-mask"
        @click.self="activeMenuId = null"
        @contextmenu.prevent
      >
        <div class="ep-menu-panel" :style="menuPosition">
          <button class="ep-menu-item" @click="onEditElement">编辑元素</button>
          <button class="ep-menu-item" @click="onTestData">测试数据</button>
          <button class="ep-menu-item" @click="onRename">编辑</button>
          <button class="ep-menu-item" @click="onCopy">复制</button>
          <button class="ep-menu-item danger" @click="onDelete">删除</button>
        </div>
      </div>
    </Teleport>

    <!-- 改名 / 复制(单字段文本) -->
    <InputModal
      :show="inputModal.open"
      :title="inputModal.title"
      :initial-value="inputModal.initial"
      :placeholder="inputModal.placeholder"
      @update:show="(v) => (inputModal.open = v)"
      @save="onInputSave"
    />

    <!-- 测试数据(JSON 编辑器,allowedKeys 严格白名单) -->
    <CodeEditorModal
      :visible="codeModal.open"
      title="测试数据"
      :value="codeModal.value"
      :allowed-keys="codeModal.allowedKeys"
      @update:visible="(v) => (codeModal.open = v)"
      @save="onCodeSave"
    />

    <!-- 删除二次确认(复用 floating/Modal.vue) -->
    <Modal
      :open="deleteModal.open"
      title="删除自定义元素"
      :content="`确定删除「${deleteModal.name}」?此操作不可撤销。`"
      danger
      @update:open="(v) => (deleteModal.open = v)"
      @confirm="onDeleteConfirm"
    />
  </aside>
</template>

<script setup lang="ts">
/**
 * 标准 / 自定义元素双 tab 面板。
 *
 * 数据流:
 * - standard: 从 PALETTE_ITEMS 静态读,groupByPalette 分桶(general / dataCodes / shapes)
 * - custom: 通过 props.designer.customElements 读(由 PrintDesigner 透传),
 *   CRUD 全部走 designer.addCustomElement/editCustomElement/copyCustomElement/removeCustomElement,
 *   这些 mutator 内部自动持久化到 localStorage
 *
 * 拖拽协议:
 * - standard: { type } JSON + text/plain fallback
 * - custom: { type, payload: t.element } JSON + text/plain fallback
 *   DesignerCanvas onDrop 优先读 application/x-designer-element(JSON),payload 合并到 createElement
 */
import { computed, inject, ref, type Ref } from "vue";
import type { Element, ElementType } from "../../core/types";
import type { CustomElementTemplate } from "../../api/useDesigner";
import type { UseDesignerReturn } from "../../api/useDesigner";
import { PALETTE_ITEMS, groupByPalette } from "../../core/palette";
import Modal from "../floating/Modal.vue";
import InputModal from "../common/InputModal.vue";
import CodeEditorModal from "../common/CodeEditorModal.vue";

const props = defineProps<{
  open: boolean;
  designer: UseDesignerReturn;
}>();

const emit = defineEmits<{
  /** palette 拖入 / 点击新增;DesignerCanvas onDrop 也是这条通道 */
  add: [
    type: ElementType,
    pageIndex?: number,
    position?: { x: number; y: number },
    payload?: Partial<Element>,
  ];
  /** 关闭按钮触发 */
  close: [];
  /** 折叠按钮触发(继承自 v1,保留兼容) */
  togglePanel: [];
  /** 「编辑元素」入口(本轮 PrintDesigner 仅 console.info,后续接画布) */
  startCustomElementEdit: [id: string];
}>();

// modal-container 注入(PrintDesigner provide);Teleport 目标走 inject 优先,fallback body
const modalContainer = inject<Ref<HTMLElement | null>>("modal-container", ref(null));
const teleportTo = computed(() => modalContainer.value ?? "body");

// ===== 标准元素数据 =====
const search = ref("");
const activeTab = ref<"standard" | "custom">("standard");

const buckets = computed(() => groupByPalette([...PALETTE_ITEMS]));
const groupLabels = ["通用", "数据 / 码", "形状"] as const;
const standardGroups = computed(() => [
  buckets.value.general,
  buckets.value.dataCodes,
  buckets.value.shapes,
]);
const filteredGroups = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return standardGroups.value;
  return standardGroups.value.map((g) => g.filter((it) => it.label.toLowerCase().includes(q)));
});

// ===== 自定义元素数据(从 designer) =====
const customElements = computed(() => props.designer.customElements.value);
const hasCustomElements = computed(() => customElements.value.length > 0);

/** 自定义图标 fallback:t.icon > PALETTE_ITEMS[type].icon > 空 */
function customIcon(t: CustomElementTemplate): string {
  if (t.icon) return t.icon;
  return PALETTE_ITEMS.find((p) => p.type === t.type)?.icon ?? "";
}

// ===== 拖拽协议 =====
function onStandardDragStart(e: DragEvent, type: ElementType) {
  const json = JSON.stringify({ type, payload: undefined });
  e.dataTransfer?.setData("application/x-designer-element", json);
  e.dataTransfer?.setData("text/plain", type);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
}
function onCustomDragStart(e: DragEvent, t: CustomElementTemplate) {
  const json = JSON.stringify({ type: t.type, payload: t.element });
  e.dataTransfer?.setData("application/x-designer-element", json);
  e.dataTransfer?.setData("text/plain", t.type);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
}

// ===== 右键菜单 =====
const activeMenuId = ref<string | null>(null);
const menuPosition = ref({ top: "0px", left: "0px" });

function openMenu(e: MouseEvent, id: string) {
  // 同一个 id 二次点击关闭菜单
  if (activeMenuId.value === id) {
    activeMenuId.value = null;
    return;
  }
  const menuWidth = 160;
  const itemCount = 5;
  const menuHeight = itemCount * 30 + 16;
  const left = Math.max(5, Math.min(e.clientX, window.innerWidth - menuWidth - 5));
  let top = e.clientY;
  if (top + menuHeight > window.innerHeight - 5) {
    top = Math.max(5, e.clientY - menuHeight);
  }
  menuPosition.value = { top: `${top}px`, left: `${left}px` };
  activeMenuId.value = id;
}

// ===== 三个弹窗状态 =====
interface InputState {
  open: boolean;
  mode: "rename" | "copy";
  targetId: string | null;
  title: string;
  initial: string;
  placeholder: string;
}
interface CodeState {
  open: boolean;
  targetId: string | null;
  value: string;
  allowedKeys: string[];
}
interface DeleteState {
  open: boolean;
  targetId: string | null;
  name: string;
}

const inputModal = ref<InputState>({
  open: false,
  mode: "rename",
  targetId: null,
  title: "",
  initial: "",
  placeholder: "",
});
const codeModal = ref<CodeState>({
  open: false,
  targetId: null,
  value: "{}",
  allowedKeys: [],
});
const deleteModal = ref<DeleteState>({ open: false, targetId: null, name: "" });

function onEditElement() {
  const id = activeMenuId.value;
  if (!id) return;
  activeMenuId.value = null;
  emit("startCustomElementEdit", id);
}
function onTestData() {
  const id = activeMenuId.value;
  if (!id) return;
  const t = customElements.value.find((x) => x.id === id);
  if (!t) return;
  activeMenuId.value = null;
  // 如果自定义元素绑定了 variable,allowedKeys 限定为该 variable(测试数据只能填这一个键)
  const allowedKeys =
    "variable" in t.element && typeof t.element.variable === "string" && t.element.variable
      ? [t.element.variable]
      : [];
  codeModal.value = {
    open: true,
    targetId: id,
    value: JSON.stringify(t.testData ?? {}, null, 2),
    allowedKeys,
  };
}
function onRename() {
  const id = activeMenuId.value;
  if (!id) return;
  const t = customElements.value.find((x) => x.id === id);
  if (!t) return;
  activeMenuId.value = null;
  inputModal.value = {
    open: true,
    mode: "rename",
    targetId: id,
    title: "编辑名称",
    initial: t.name,
    placeholder: "请输入名称",
  };
}
function onCopy() {
  const id = activeMenuId.value;
  if (!id) return;
  const t = customElements.value.find((x) => x.id === id);
  if (!t) return;
  activeMenuId.value = null;
  inputModal.value = {
    open: true,
    mode: "copy",
    targetId: id,
    title: "复制元素",
    initial: `${t.name} 副本`,
    placeholder: "请输入新名称",
  };
}
function onDelete() {
  const id = activeMenuId.value;
  if (!id) return;
  const t = customElements.value.find((x) => x.id === id);
  if (!t) return;
  activeMenuId.value = null;
  deleteModal.value = { open: true, targetId: id, name: t.name };
}

function onInputSave(v: string) {
  const name = v.trim();
  if (!name || !inputModal.value.targetId) return;
  if (inputModal.value.mode === "rename") {
    props.designer.editCustomElement(inputModal.value.targetId, { name });
  } else {
    props.designer.copyCustomElement(inputModal.value.targetId, { name });
  }
  inputModal.value.open = false;
}
function onCodeSave(parsed: unknown) {
  if (!codeModal.value.targetId) return;
  props.designer.editCustomElement(codeModal.value.targetId, {
    testData: parsed as Record<string, unknown>,
  });
  codeModal.value.open = false;
}
function onDeleteConfirm() {
  if (deleteModal.value.targetId) {
    props.designer.removeCustomElement(deleteModal.value.targetId);
  }
  deleteModal.value.open = false;
}
</script>

<style scoped>
/* ===== 面板外壳(继承 v1 浮层定位) ===== */
.elements-panel {
  position: absolute;
  top: 32px; /* 给顶部 ruler 让位 */
  left: 32px; /* 给左侧 ruler 让位 */
  bottom: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  overflow: hidden;
  transition: width 200ms;
  z-index: 30; /* 高于画布 / 自延长线 / 吸附线 / ruler、低于 corner */
}
.elements-panel.closed {
  width: 0;
  border-right: 0;
}

/* ===== 顶部 header(标题 + 副标题 + 关闭) ===== */
.ep-header-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex: 0 0 auto;
}
.ep-titles {
  min-width: 0;
}
.ep-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  line-height: 1.4;
}
.ep-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
}
.ep-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: #595959;
  cursor: pointer;
  flex: 0 0 auto;
  transition: background 120ms, color 120ms;
}
.ep-close:hover {
  background: #f5f5f5;
  color: #ff4d4f;
}

/* ===== tabs ===== */
.ep-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  flex: 0 0 auto;
}
.ep-tab {
  flex: 1;
  height: 36px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  color: #595959;
  cursor: pointer;
  transition: color 120ms, border-color 120ms;
}
.ep-tab:hover {
  color: #1677ff;
}
.ep-tab.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
  font-weight: 500;
}

/* ===== body 容器 ===== */
.ep-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

/* ===== standard 搜索行 ===== */
.ep-search-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
}
.ep-search {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  outline: none;
  transition: border-color 120ms;
}
.ep-search:focus {
  border-color: #1677ff;
}
.ep-fold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #595959;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  flex: 0 0 auto;
}
.ep-fold:hover {
  background: #f5f5f5;
  color: #1677ff;
  border-color: #91caff;
}
.fold-icon {
  display: inline-block;
  transform: translateY(-1px);
}

/* ===== 分组 ===== */
.ep-group {
  padding: 4px 0 8px;
}
.ep-group-title {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 500;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ===== 网格(标准 + 自定义共用) ===== */
.ep-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 0 12px;
}
.ep-grid-wide {
  padding: 8px 12px;
}

/* ===== 卡片 ===== */
.ep-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 80px;
  padding: 12px 6px;
  background: #fff;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #595959;
  cursor: move;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.ep-item:hover {
  background: #f5f5f5;
  border-color: #91caff;
  color: #1677ff;
}
.ep-item-custom:hover .ep-more {
  opacity: 1;
}
.ep-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: #595959;
}
.ep-item:hover .ep-icon {
  color: #1677ff;
}
.ep-icon :deep(svg) {
  width: 28px;
  height: 28px;
  display: block;
}
.ep-label {
  font-size: 12px;
  line-height: 1.3;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ===== 卡片右上角 MoreVert ===== */
.ep-more {
  position: absolute;
  top: 4px;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: #8c8c8c;
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms, background 120ms, color 120ms;
}
.ep-more:hover {
  background: #fff;
  opacity: 1;
}

/* ===== 空态 ===== */
.ep-empty {
  padding: 32px 12px;
  text-align: center;
  font-size: 12px;
  color: #999;
}

/* ===== 右键菜单 ===== */
.ep-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 10001;
  pointer-events: auto;
}
.ep-menu-panel {
  position: fixed;
  width: 160px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
}
.ep-menu-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  font-size: 13px;
  color: #262626;
  background: transparent;
  border: 0;
  border-radius: 2px;
  text-align: left;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.ep-menu-item:hover {
  background: #f5f5f5;
  color: #1677ff;
}
.ep-menu-item.danger {
  color: #ff4d4f;
}
.ep-menu-item.danger:hover {
  background: #fff1f0;
  color: #ff4d4f;
}
</style>