<template>
  <div class="prop-col">
    <div class="prop-side">
      <button
        class="side-btn"
        title="添加元素"
        @click="$emit('addElement')"
      ><plus-outlined /></button>
      <button
        class="side-btn"
        :disabled="!element"
        title="复制元素"
        @click="$emit('duplicate')"
      ><copy-outlined /></button>
      <button
        class="side-btn"
        :disabled="!element"
        title="上移一层"
        @click="$emit('moveUp')"
      ><arrow-up-outlined /></button>
      <button
        class="side-btn"
        :disabled="!element"
        title="下移一层"
        @click="$emit('moveDown')"
      ><arrow-down-outlined /></button>
    </div>
    <aside class="prop-panel">
      <div v-if="!element" class="empty">未选中元素</div>
      <template v-else>
        <a-tabs v-model:active-key="activeKey" class="prop-tabs">
          <a-tab-pane
            v-if="groups.base.length"
            key="base"
            tab="基础"
          >
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
          </a-tab-pane>

          <a-tab-pane
            v-if="groups.style.length"
            key="style"
            tab="样式"
          >
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
          </a-tab-pane>

          <a-tab-pane
            v-if="groups.border.length"
            key="border"
            tab="边框"
          >
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
            <!-- 4 边独立(已由 BORDER_SECTION 字段渲染) -->
          </a-tab-pane>

          <a-tab-pane
            v-if="groups.advanced.length"
            key="advanced"
            tab="高级"
          >
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
          </a-tab-pane>

          <a-tab-pane
            v-if="element.type === 'table'"
            key="columns"
            :tab="`列 (${element.columns.length})`"
          >
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
          </a-tab-pane>
        </a-tabs>
      </template>
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
  element: Element | null
}>()

const emit = defineEmits<{
  update: [id: string, patch: Partial<Element>]
  addElement: []
  duplicate: []
  moveUp: []
  moveDown: []
}>()

const groups = computed(() => {
  if (!props.element) {
    return { base: [], style: [], border: [], advanced: [], columns: [] }
  }
  return groupByCategory(getSections(props.element))
})

/** 计算当前元素实际可用的 category 列表(基础一定有,其他按 section 是否非空) */
const availableCategories = computed<Category[]>(() => {
  const list: Category[] = []
  if (groups.value.base.length) list.push('base')
  if (groups.value.style.length) list.push('style')
  if (groups.value.border.length) list.push('border')
  if (groups.value.advanced.length) list.push('advanced')
  if (props.element?.type === 'table') list.push('columns')
  return list
})

const activeKey = ref<Category>('base')

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
  else if (target.type === 'number') raw = Number(target.value)
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
  background: #fafafa;
  border-left: 1px solid #f0f0f0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
}
.prop-side {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 6px;
  background: #fafafa;
  border-left: 1px solid #f0f0f0;
  flex: 0 0 auto;
}
.side-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #555;
  cursor: pointer;
  font-size: 14px;
  transition: background 120ms, border-color 120ms, color 120ms;
}
.side-btn:hover:not(:disabled) {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1677ff;
}
.side-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.prop-panel {
  width: 300px;
  height: 100%;
  background: #fafafa;
  padding: 16px;
  overflow: auto;
  flex-shrink: 0;
  font-size: 13px;
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
.section-title {
  font-weight: 500;
  margin: 10px 0 8px;
  color: #555;
  font-size: 12px;
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
</style>
