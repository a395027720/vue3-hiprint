<!--
  顶栏(品牌 + 元素类型选择 + 保存)。

  元素类型图标网格(文本/图片/表格/线条)点击触发 add 事件。
  风格参考 Vue-Print-Designer:logo+品牌左对齐,元素居中,保存按钮右对齐。
-->
<template>
  <header class="topbar">
    <div class="topbar-brand">
      <printer-outlined class="brand-icon" />
      <span class="brand-text">打印设计器</span>
    </div>
    <nav class="topbar-elements">
      <button
        v-for="item in items"
        :key="item.type"
        class="el-btn"
        :title="item.label"
        @click="$emit('add', item.type)"
      >
        <span class="el-icon" v-html="item.icon" />
        <span class="el-label">{{ item.label }}</span>
      </button>
    </nav>
    <div class="topbar-actions">
      <button class="save-btn" :disabled="!dirty" @click="$emit('save')">
        <save-outlined /> 保存
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { ElementType } from '../core/types'

defineProps<{
  /** 当前模板是否有未保存修改(决定保存按钮是否可用) */
  dirty?: boolean
}>()

defineEmits<{
  add: [type: ElementType]
  save: []
}>()

interface PaletteItem {
  type: ElementType
  label: string
  icon: string
}

const stroke = 'currentColor'
const sw = 1.6
// 内联 SVG heroicons-style 图标
const items: PaletteItem[] = [
  {
    type: 'text',
    label: '文本',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  },
  {
    type: 'image',
    label: '图片',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  },
  {
    type: 'table',
    label: '表格',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  },
  {
    type: 'line',
    label: '线条',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="4"/></svg>`,
  },
]
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  height: 56px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  gap: 24px;
}
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 0 0 auto;
}
.brand-icon {
  font-size: 20px;
  color: #1677ff;
}
.brand-text {
  white-space: nowrap;
}
.topbar-elements {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}
.el-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #555;
  font-size: 12px;
  transition: all 120ms;
}
.el-btn:hover {
  background: #f0f7ff;
  border-color: #91caff;
  color: #1677ff;
}
.el-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.el-label {
  line-height: 1;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.save-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  background: #1677ff;
  border: 1px solid #1677ff;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms;
}
.save-btn:hover:not(:disabled) {
  background: #4096ff;
  border-color: #4096ff;
}
.save-btn:disabled {
  background: #f0f0f0;
  border-color: #f0f0f0;
  color: #bfbfbf;
  cursor: not-allowed;
}
</style>
