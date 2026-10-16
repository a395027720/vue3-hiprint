<template>
  <div class="prop-col" :class="{ closed: !props.open }">
    <aside class="prop-panel">
      <div class="prop-body">
        <div v-if="!element" class="empty">未选中元素</div>
        <template v-else>
          <div class="prop-tabs">
            <button
              v-for="tab in availableTabs"
              :key="tab.key"
              class="prop-tab-btn"
              :class="{ active: activeKey === tab.key }"
              @click="activeKey = tab.key"
            >{{ tab.label }}</button>
          </div>
          <div v-show="activeKey === 'base'" class="prop-tab-pane">
            <template v-for="section in groups.base" :key="section.title">
              <div class="section-title">{{ section.title }}</div>
              <div class="fields" :class="`cols-${section.columns ?? 1}`">
                <FieldRow
                  v-for="f in section.fields"
                  :key="f.key"
                  :field="f"
                  :element="element"
                  @change="onFieldChange(f, $event)"
                />
              </div>
            </template>
          </div>
          <div v-show="activeKey === 'style'" class="prop-tab-pane">
            <template v-for="section in groups.style" :key="section.title">
              <div class="section-title">{{ section.title }}</div>
              <div class="fields" :class="`cols-${section.columns ?? 1}`">
                <FieldRow
                  v-for="f in section.fields"
                  :key="f.key"
                  :field="f"
                  :element="element"
                  @change="onFieldChange(f, $event)"
                />
              </div>
            </template>
          </div>
          <div v-show="activeKey === 'border'" class="prop-tab-pane">
            <template v-for="section in groups.border" :key="section.title">
              <div class="section-title">{{ section.title }}</div>
              <div class="fields" :class="`cols-${section.columns ?? 1}`">
                <FieldRow
                  v-for="f in section.fields"
                  :key="f.key"
                  :field="f"
                  :element="element"
                  @change="onFieldChange(f, $event)"
                />
              </div>
            </template>
          </div>
          <div v-show="activeKey === 'advanced'" class="prop-tab-pane">
            <template v-for="section in groups.advanced" :key="section.title">
              <div class="section-title">{{ section.title }}</div>
              <div class="fields" :class="`cols-${section.columns ?? 1}`">
                <FieldRow
                  v-for="f in section.fields"
                  :key="f.key"
                  :field="f"
                  :element="element"
                  @change="onFieldChange(f, $event)"
                />
              </div>
            </template>
            <div class="prop-divider" />
            <button
              type="button"
              class="prop-custom-add"
              title="将当前元素的全部字段保存为自定义元素模板"
              @click="emit('saveAsCustomElement', element.id)"
            >
              + 保存为自定义元素
            </button>
          </div>
          <div v-if="element.type === 'table'" v-show="activeKey === 'columns'" class="prop-tab-pane">
            <div v-for="(c, i) in element.columns" :key="i" class="col-row">
              <input
                type="text"
                :value="c.field"
                placeholder="field"
                @input="patchColumn(i, 'field', $event)"
              />
              <input
                type="text"
                :value="c.title"
                placeholder="标题"
                @input="patchColumn(i, 'title', $event)"
              />
              <input
                type="number"
                :value="c.width"
                placeholder="宽"
                @input="patchColumn(i, 'width', $event)"
              />
              <button class="col-del" @click="removeColumn(i)">×</button>
            </div>
            <button class="col-add" @click="addColumn">+ 添加列</button>
          </div>
        </template>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Element, TableColumn, TableElement } from '../../core/types'
import {
  getSections,
  groupByCategory,
  normalizePatchValue,
  type Category,
  type FieldDef,
} from '../../core/fieldSchema'
import FieldRow from '../fields/FieldRow.vue'

const props = defineProps<{
  /** 是否展开(由 PrintDesigner 控制) */
  open: boolean
  element: Element | null
}>()

const emit = defineEmits<{
  update: [id: string, patch: Partial<Element>]
  /** 高级 tab「保存为自定义元素」按钮触发;由 PrintDesigner 弹 InputModal 收名字 */
  saveAsCustomElement: [id: string]
}>()

const groups = computed(() => {
  if (!props.element) {
    return { base: [], style: [], border: [], advanced: [], columns: [] }
  }
  return groupByCategory(getSections(props.element))
})

/** 计算当前元素实际可用的 category 列表。
 * 基础/样式/边框 按 section 是否非空决定;advanced 始终放最末位(内含"保存为自定义元素"按钮);
 * table 元素的 columns 排在 advanced 前(分页相关配置在高级,列编辑更常用) */
const availableCategories = computed<Category[]>(() => {
  const list: Category[] = []
  if (groups.value.base.length) list.push('base')
  if (groups.value.style.length) list.push('style')
  if (groups.value.border.length) list.push('border')
  if (props.element?.type === 'table') list.push('columns')
  list.push('advanced') // 始终显示,固定在最末位
  return list
})

const activeKey = ref<Category>('base')

/** 当前元素可见 tab 列表(带 label),供模板渲染按钮组。
 * advanced 始终在最末位(承载「保存为自定义元素」入口,即使该元素无 advanced section) */
const availableTabs = computed<{ key: Category; label: string }[]>(() => {
  const list: { key: Category; label: string }[] = []
  if (groups.value.base.length) list.push({ key: 'base', label: '基础' })
  if (groups.value.style.length) list.push({ key: 'style', label: '样式' })
  if (groups.value.border.length) list.push({ key: 'border', label: '边框' })
  if (props.element?.type === 'table') {
    list.push({ key: 'columns', label: `列 (${props.element.columns.length})` })
  }
  list.push({ key: 'advanced', label: '高级' })
  return list
})

// 选中元素变化时,重置到第一个可用的 tab
watch(availableCategories, (list) => {
  if (list.length === 0) {
    activeKey.value = 'base'
  } else if (!list.includes(activeKey.value)) {
    activeKey.value = list[0]
  }
}, { immediate: true })

function onFieldChange(field: FieldDef, e: Event) {
  if (!props.element) return
  const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  let raw: unknown
  if (target.type === 'checkbox') raw = (target as HTMLInputElement).checked
  else if (target.type === 'number') raw = target.value === '' ? undefined : Number(target.value)
  else raw = target.value
  const value = normalizePatchValue(field, props.element, raw)
  emit('update', props.element.id, { [field.key]: value } as Partial<Element>)
}

function patchColumn(i: number, field: keyof TableColumn, e: Event) {
  if (!props.element || props.element.type !== 'table') return
  const t = props.element
  const target = e.target as HTMLInputElement
  const value: string | number = field === 'width' ? Number(target.value) : target.value
  emit('update', t.id, {
    columns: t.columns.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
  } as Partial<TableElement>)
}

function removeColumn(i: number) {
  if (!props.element || props.element.type !== 'table') return
  const t = props.element
  emit('update', t.id, {
    columns: t.columns.filter((_, idx) => idx !== i),
  } as Partial<TableElement>)
}

function addColumn() {
  if (!props.element || props.element.type !== 'table') return
  const t = props.element
  emit('update', t.id, {
    columns: [...t.columns, { field: '', title: '新列', width: 30 }],
  } as Partial<TableElement>)
}
</script>

<style scoped>
.prop-col {
  position: absolute;
  right: 0;
  top: 32px; /* 给顶部 ruler(32px)让位,避免被盖 */
  height: calc(100% - 32px);
  z-index: 50;
  display: flex;
  background: #ffffff;
  border-left: 1px solid #f0f0f0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
  transition: width 200ms;
  width: 300px;
  overflow: hidden;
}
.prop-col.closed {
  width: 0;
  border-left: 0;
  box-shadow: none;
}
.prop-panel {
  width: 300px;
  height: 100%;
  background: #ffffff;
  flex-shrink: 0;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.prop-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
/* 颜色/背景字段:把 ColorPicker 触发器加宽成矩形(参考 Vue-Print-Designer PropertyColor) */
.prop-body :deep(.cp-trigger) {
  width: 36px;
  height: 22px;
  border-radius: 3px;
  border-color: #d0d0d0;
}
.prop-body :deep(.cp-trigger:hover) {
  border-color: #91caff;
}
.empty {
  color: #999;
  padding: 32px 0;
  text-align: center;
}
.prop-tabs {
  background: transparent;
}
.prop-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}
.prop-tabs :deep(.ant-tabs-tab) {
  padding: 6px 12px;
  font-size: 13px;
}
/* 自绘 tab 按钮(替代 a-tabs) */
.prop-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.prop-tab-btn {
  padding: 6px 12px;
  font-size: 13px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #555;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 120ms, border-color 120ms;
}
.prop-tab-btn:hover {
  color: #1677ff;
}
.prop-tab-btn.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
}
.prop-tab-pane {
  /* 与 a-tab-pane 视觉一致,无 padding */
}
.section-title {
  font-weight: 600;
  margin: 12px 0 8px;
  color: #333;
  font-size: 14px;
}
.fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fields.cols-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.col-row {
  display: grid;
  grid-template-columns: 1fr 1fr 56px 24px;
  gap: 4px;
  margin-bottom: 4px;
  align-items: center;
}
.col-row input {
  padding: 4px 6px;
  border: 1px solid #d0d0d0;
  border-radius: 2px;
  font-size: 12px;
}
.col-del {
  border: none;
  background: #ff4d4f;
  color: white;
  cursor: pointer;
  border-radius: 2px;
  height: 26px;
  font-size: 14px;
  line-height: 1;
}
.col-add {
  width: 100%;
  margin-top: 6px;
  padding: 4px 8px;
  border: 1px dashed #d0d0d0;
  background: white;
  border-radius: 2px;
  cursor: pointer;
  font-size: 12px;
}

/* 「保存为自定义元素」按钮(高级 tab 底部) */
.prop-divider {
  margin: 16px 0 8px;
  height: 1px;
  background: #f0f0f0;
}
.prop-custom-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #1677ff;
  background: #fff;
  border: 1px solid #91caff;
  border-radius: 4px;
  cursor: pointer;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.prop-custom-add:hover {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #0958d9;
}
</style>
