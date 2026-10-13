<template>
  <label class="field-row" :class="`kind-${field.kind}`">
    <span v-if="field.kind !== 'checkbox'" class="field-label">{{ field.label }}</span>
    <input
      v-if="field.kind === 'text'"
      type="text"
      :value="displayValue"
      @input="$emit('change', $event)"
    />
    <textarea
      v-else-if="field.kind === 'textarea'"
      :value="displayValue"
      rows="2"
      @input="$emit('change', $event)"
    />
    <input
      v-else-if="field.kind === 'number'"
      type="number"
      :value="displayValue"
      :min="field.min"
      :max="field.max"
      :step="field.step"
      @input="$emit('change', $event)"
    />
    <select
      v-else-if="field.kind === 'select'"
      :value="displayValue"
      @change="$emit('change', $event)"
    >
      <option v-for="opt in field.options ?? []" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <input
      v-else-if="field.kind === 'color'"
      type="color"
      :value="displayValue"
      @input="$emit('change', $event)"
    />
    <label v-else-if="field.kind === 'checkbox'" class="checkbox-wrap">
      <input
        type="checkbox"
        :checked="displayValue"
        @change="$emit('change', $event)"
      />
      <span>{{ field.label }}</span>
    </label>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Element } from '../core/types'
import type { FieldDef } from '../core/fieldSchema'

const props = defineProps<{
  field: FieldDef
  element: Element
}>()

defineEmits<{
  change: [e: Event]
}>()

const displayValue = computed(() => {
  const v = (props.element as Record<string, unknown>)[props.field.key]
  if (v == null) return ''
  if (props.field.kind === 'checkbox') {
    // 约定:fontWeight 字段用 'bold' / 'normal',rowBreak 用 'row' / 'auto',其它 checkbox 用 boolean
    if (props.field.key === 'fontWeight') return v === 'bold'
    if (props.field.key === 'rowBreak') return v === 'row'
    return !!v
  }
  return v
})
</script>

<style scoped>
.field-row {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-size: 13px;
}
.field-label {
  display: block;
  margin-bottom: 2px;
}
input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 6px;
  border: 1px solid #d0d0d0;
  border-radius: 2px;
  font-size: 13px;
  font-family: inherit;
}
textarea { resize: vertical; }
input[type='color'] {
  height: 32px;
  padding: 2px;
  cursor: pointer;
}
.checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  margin: 0;
}
.checkbox-wrap input { width: auto; margin: 0; }
.kind-checkbox { display: flex; align-items: center; margin-bottom: 8px; }
</style>
