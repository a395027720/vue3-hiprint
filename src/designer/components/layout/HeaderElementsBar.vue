<!--
  HeaderElementsBar — 顶栏水平元素按钮条(S5)。

  设计思路来源:Vue-Print-Designer-master HeaderElementsBar.vue。
  本项目改造点:
  - 不引入 Pinia / i18n / iconify;数据全部从 palette.ts 静态导入
  - 标准 tab 直接读 PALETTE_ITEMS,分 3 组(general / dataCodes / shapes),用分组竖线分隔
  - 自定义 tab 占位(S5 之前未开放 store.customElements,显示提示语)
  - 元素点击 → emit add(type),由 HeaderToolbar 透传给 PrintDesigner.onAdd → designer.add
  - 元素 dragstart 携带 type 给画布 drop,与 ElementsPanel 共享同一协议('application/x-designer-element')
-->
<template>
  <div class="heb">
    <!-- 自定义 / 标准 切换按钮:仅在有自定义元素时才显示,本项目暂未启用自定义元素 -->
    <button
      v-if="hasCustomElements"
      class="heb-toggle"
      type="button"
      :title="isCustom ? '切换到标准元素' : '切换到自定义元素'"
      @click="toggleList"
    >
      <span v-html="swapIcon" />
    </button>

    <span v-if="hasCustomElements" class="heb-sep" />

    <!-- 溢出检测:窄屏(<=1360)且元素溢出时,显示左右翻页箭头 -->
    <button
      v-if="shouldShowScrollArrows"
      class="heb-arrow"
      type="button"
      :disabled="!canScrollLeft"
      title="向左滚动"
      @click="scrollBy(-1)"
    >
      <span v-html="chevronLeftIcon" />
    </button>

    <div
      ref="scrollerRef"
      class="heb-scroller"
      @scroll="updateScrollState"
    >
      <div v-if="!isCustom" class="heb-content">
        <template v-for="(group, gi) in standardGroups" :key="gi">
          <span v-if="gi > 0" class="heb-sep" />
          <button
            v-for="item in group"
            :key="item.type"
            type="button"
            class="heb-item"
            :title="item.label"
            draggable="true"
            @dragstart="onDragStart($event, item.type)"
            @click="$emit('add', item.type)"
          >
            <span class="heb-icon" v-html="item.icon" />
            <span class="heb-label">{{ item.label }}</span>
          </button>
        </template>
      </div>

      <div v-else class="heb-empty">暂无自定义元素</div>
    </div>

    <button
      v-if="shouldShowScrollArrows"
      class="heb-arrow"
      type="button"
      :disabled="!canScrollRight"
      title="向右滚动"
      @click="scrollBy(1)"
    >
      <span v-html="chevronRightIcon" />
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * HeaderElementsBar 内部状态:
 * - activeList: 'standard' | 'custom'(目前 custom 永远无数据)
 * - isOverflow + canScrollLeft/Right:窄屏(<1360px)且内容宽度超出容器时,显示左右翻页箭头
 *
 * 数据来源:PALETTE_ITEMS(groupByPalette 已按 general/dataCodes/shapes 分桶)。
 * 自定义元素暂不开放:hasCustomElements 永远是 false(等 S5 store.customElements 接入后
 * 再从这里读,目前 ElementsPanel 也是同样的占位处理)。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ElementType } from "../../core/types";
import { PALETTE_ITEMS, groupByPalette } from "../../core/palette";

defineEmits<{
  /** 点击 / 拖入元素(由 HeaderToolbar 透传到 PrintDesigner.onAdd) */
  add: [type: ElementType];
}>();

const SMALL_SCREEN_BREAKPOINT = 1360;

const activeList = ref<"standard" | "custom">("standard");
const isCustom = computed(() => activeList.value === "custom");

/** 自定义元素列表(S5 之前没有数据源,固定为 []) */
const customElements: ReadonlyArray<{ id: string; type: ElementType }> = [];
const hasCustomElements = computed(() => customElements.length > 0);

const buckets = computed(() => groupByPalette([...PALETTE_ITEMS]));
/** 标准元素按 group 顺序展开成 [group, group, group] 三组 */
const standardGroups = computed(() => [
  buckets.value.general,
  buckets.value.dataCodes,
  buckets.value.shapes,
]);

function toggleList() {
  activeList.value = isCustom.value ? "standard" : "custom";
}

function onDragStart(e: DragEvent, type: ElementType) {
  // 与 ElementsPanel 协议相同:'application/x-designer-element' 优先,'text/plain' 兜底
  e.dataTransfer?.setData("text/plain", type);
  e.dataTransfer?.setData("application/x-designer-element", type);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
}

// ===== 窄屏溢出检测 =====
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
  // 容差 1px:浮点 scrollWidth/clientWidth 边界情况允许小偏差
  const overflow = el.scrollWidth > el.clientWidth + 1;
  isOverflow.value = overflow;
  canScrollLeft.value = el.scrollLeft > 1;
  canScrollRight.value =
    el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
}

function scrollBy(direction: -1 | 1) {
  const el = scrollerRef.value;
  if (!el) return;
  el.scrollBy({
    left: direction * Math.max(120, el.clientWidth * 0.6),
    behavior: "smooth",
  });
}

/** 窄屏 + 溢出 才显示左右箭头 */
const shouldShowScrollArrows = computed(() => {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= SMALL_SCREEN_BREAKPOINT && isOverflow.value;
});

function handleResize() {
  updateScrollState();
}

watch(activeList, () => {
  nextTick(updateScrollState);
});

onMounted(() => {
  // 下一帧再测,确保 scroller 内容已布局完
  nextTick(updateScrollState);
  window.addEventListener("resize", handleResize);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
});

// ===== 内联 SVG icons(cp-icon 风格:1em × 1em,currentColor)=====
const chevronLeftIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M15.4 16.6L10.8 12l4.6-4.6L14 6l-6 6l6 6z"/></svg>`;
const chevronRightIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"/></svg>`;
// 切换标准/自定义 的左右箭头图标
const swapIcon = `<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M7.5 21L3 16.5l1.4-1.4l3.1 3.1V8h2v10.2l3.1-3.1L14 16.5zM14.5 3L19 7.5l-1.4 1.4L14.5 5.8V16h-2V5.8L9.4 8.9L8 7.5z"/></svg>`;
</script>

<style scoped>
.heb {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: 0;
}
.heb-sep {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: #d9d9d9;
  margin: 0 4px;
  flex: 0 0 auto;
}
.heb-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 26px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #444;
  cursor: pointer;
  flex: 0 0 auto;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.heb-toggle :deep(svg) {
  display: block;
}
.heb-toggle:hover {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.heb-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 26px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #595959;
  cursor: pointer;
  flex: 0 0 auto;
  transition: background 120ms, color 120ms;
}
.heb-arrow :deep(svg) {
  display: block;
}
.heb-arrow:hover:not(:disabled) {
  background: #e6f4ff;
  color: #1677ff;
}
.heb-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.heb-scroller {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.heb-scroller::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.heb-content {
  display: inline-flex;
  align-items: center;
  gap: 0;
  min-width: max-content;
}
.heb-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 48px;
  height: 48px;
  padding: 4px 2px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #595959;
  cursor: move;
  flex: 0 0 auto;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.heb-item:hover {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.heb-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.heb-icon :deep(svg) {
  display: block;
}
.heb-label {
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.heb-empty {
  padding: 0 12px;
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
</style>