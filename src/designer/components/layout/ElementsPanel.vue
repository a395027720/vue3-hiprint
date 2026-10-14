<script setup lang="ts">
/**
 * ElementsPanel — 左侧元素面板(浮层,可关闭)。
 *
 * - 顶部:搜索框(标准 tab 内过滤)
 * - 标准 tab:general / dataCodes / shapes 三折叠组
 * - 自定义 tab:占位(MVP 暂未开放 custom 元素)
 * - 自身折叠按钮:emit toggle-panel
 */
import { computed, ref } from 'vue'
import type { ElementType } from '../../core/types'
import { PALETTE_ITEMS, groupByPalette } from '../../core/palette'

const props = defineProps<{
  /** 是否展开(S4 默认 true) */
  open: boolean
}>()

const emit = defineEmits<{
  /** 点击 / 拖入元素 */
  add: [type: ElementType]
  /** 切换面板开/关(由自身折叠按钮触发) */
  togglePanel: []
}>()

const search = ref('')
const activeTab = ref<'standard' | 'custom'>('standard')

const allItems = computed(() => PALETTE_ITEMS)
const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return groupByPalette(allItems.value)
  const matched = allItems.value.filter((it) => it.label.toLowerCase().includes(q))
  return groupByPalette(matched)
})

function onDragStart(e: DragEvent, type: ElementType) {
  e.dataTransfer?.setData('text/plain', type)
  e.dataTransfer?.setData('application/x-designer-element', type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <aside class="elements-panel" :class="{ closed: !props.open }">
    <header class="ep-header">
      <input
        v-model="search"
        type="text"
        class="ep-search"
        placeholder="搜索元素"
      />
      <button class="ep-fold" title="折叠" @click="emit('togglePanel')">
        <span class="fold-icon">‹</span>
      </button>
    </header>

    <div class="ep-tabs">
      <button
        :class="['ep-tab', { active: activeTab === 'standard' }]"
        @click="activeTab = 'standard'"
      >
        标准
      </button>
      <button
        :class="['ep-tab', { active: activeTab === 'custom' }]"
        @click="activeTab = 'custom'"
      >
        自定义
      </button>
    </div>

    <div v-if="activeTab === 'standard'" class="ep-body">
      <section v-if="filteredItems.general.length" class="ep-group">
        <div class="ep-group-title">通用</div>
        <div class="ep-grid">
          <button
            v-for="it in filteredItems.general"
            :key="it.type"
            class="ep-item"
            :title="it.label"
            draggable="true"
            @dragstart="onDragStart($event, it.type)"
          >
            <span class="ep-icon" v-html="it.icon" />
            <span class="ep-label">{{ it.label }}</span>
          </button>
        </div>
      </section>

      <section v-if="filteredItems.dataCodes.length" class="ep-group">
        <div class="ep-group-title">数据 / 码</div>
        <div class="ep-grid">
          <button
            v-for="it in filteredItems.dataCodes"
            :key="it.type"
            class="ep-item"
            :title="it.label"
            draggable="true"
            @dragstart="onDragStart($event, it.type)"
          >
            <span class="ep-icon" v-html="it.icon" />
            <span class="ep-label">{{ it.label }}</span>
          </button>
        </div>
      </section>

      <section v-if="filteredItems.shapes.length" class="ep-group">
        <div class="ep-group-title">形状</div>
        <div class="ep-grid">
          <button
            v-for="it in filteredItems.shapes"
            :key="it.type"
            class="ep-item"
            :title="it.label"
            draggable="true"
            @dragstart="onDragStart($event, it.type)"
          >
            <span class="ep-icon" v-html="it.icon" />
            <span class="ep-label">{{ it.label }}</span>
          </button>
        </div>
      </section>
    </div>

    <div v-else class="ep-body">
      <div class="ep-empty">自定义元素(预留,后续版本)</div>
    </div>
  </aside>
</template>

<style scoped>
.elements-panel {
  display: flex;
  flex-direction: column;
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  overflow: hidden;
  transition: width 200ms;
  z-index: 40;
}
.elements-panel.closed {
  width: 0;
  border-right: 0;
}
.ep-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex: 0 0 auto;
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

.ep-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  flex: 0 0 auto;
}
.ep-tab {
  flex: 1;
  height: 32px;
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
}

.ep-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.ep-group {
  padding: 4px 0 8px;
}
.ep-group-title {
  padding: 6px 12px 4px;
  font-size: 11px;
  font-weight: 500;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ep-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 0 8px;
}
.ep-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 56px;
  padding: 6px 2px;
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
.ep-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.ep-label {
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.ep-empty {
  padding: 32px 12px;
  text-align: center;
  font-size: 12px;
  color: #999;
}
</style>
