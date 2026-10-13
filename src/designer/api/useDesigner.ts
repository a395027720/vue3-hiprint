/**
 * useDesigner — 单一 Composition API 入口。
 *
 * 收敛:模板状态、选中元素、增删改、JSON 导入导出、打印触发。
 * 不做:UI 渲染(交给 <PrintDesigner> 组件)、history(后续 PR)。
 *
 * 模板用 shallowRef 包,内部用 schema.ts 的 immutable helper 更新。
 * 这样 Vue 不会深度代理整个 element 树(尤其 table 很大时性能更好),
 * 组件侧用 template.value = nextTemplate 整体替换触发响应。
 */

import { ref, shallowRef, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

import type { Element, ElementType, Template } from '../core/types'
import {
  addElement as addEl,
  createElement,
  createTemplate,
  findElement,
  removeElement as removeEl,
  setPaper as setPaperHelper,
  updateElement as updateEl,
} from '../core/schema'

export interface UseDesignerOptions {
  /** 初始模板(可选,默认空白 A4) */
  template?: Template
  /** 是否有未保存修改 */
  onDirtyChange?: (dirty: boolean) => void
}

export interface UseDesignerReturn {
  /** 当前模板(整体替换触发响应) */
  template: Ref<Template>
  /** 选中元素的 id */
  selectedId: Ref<string | null>
  /** 选中元素(只读) */
  selected: ComputedRef<Element | null>
  /** 选中元素 id(响应式 set) */
  select: (id: string | null) => void
  /** 添加新元素(在画布中央) */
  add: (type: ElementType) => Element
  /** 不可变更新元素 patch */
  update: (id: string, patch: Partial<Element>) => void
  /** 删除元素 */
  remove: (id: string) => void
  /** 替换 paper */
  setPaper: (paper: Template['paper']) => void
  /** 整体替换模板(用于 JSON 导入) */
  load: (tpl: Template) => void
  /** 导出 JSON 字符串 */
  toJson: () => string
  /** 从 JSON 字符串导入,失败返回 false */
  loadJson: (raw: string) => boolean
  /** dirty 标志 */
  dirty: ComputedRef<boolean>
  /** 标记已保存(清空 dirty) */
  markClean: () => void
}

export function useDesigner(options: UseDesignerOptions = {}): UseDesignerReturn {
  const initial = options.template ?? createTemplate()
  // 用 shallowRef 避免深代理,Template 整体替换
  const template = shallowRef<Template>(initial)
  const selectedId = ref<string | null>(null)
  const lastSaved = shallowRef<Template>(initial)
  const dirty = computed(() => template.value !== lastSaved.value)
  // 暂不实现 onDirtyChange,留给后续 PR(via watch)

  const selected = computed<Element | null>(() =>
    selectedId.value ? findElement(template.value, selectedId.value) ?? null : null,
  )

  function add(type: ElementType): Element {
    const tpl = template.value
    const el = createElement(type, {
      // 默认放在画布中央,基于 paper 中心
      x: Math.max(0, (tpl.paper.width - 60) / 2),
      y: Math.max(0, (tpl.paper.height - 20) / 2),
    })
    template.value = addEl(tpl, el)
    selectedId.value = el.id
    return el
  }

  function update(id: string, patch: Partial<Element>): void {
    template.value = updateEl(template.value, id, patch as never)
  }

  function remove(id: string): void {
    template.value = removeEl(template.value, id)
    if (selectedId.value === id) selectedId.value = null
  }

  function setPaper(paper: Template['paper']): void {
    template.value = setPaperHelper(template.value, paper)
  }

  function load(tpl: Template): void {
    template.value = tpl
    selectedId.value = null
  }

  function toJson(): string {
    return JSON.stringify(template.value, null, 2)
  }

  function loadJson(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw) as Template
      if (!parsed || parsed.version !== '1.0' || !parsed.paper || !Array.isArray(parsed.elements)) {
        return false
      }
      load(parsed)
      return true
    } catch {
      return false
    }
  }

  function markClean(): void {
    lastSaved.value = template.value
  }

  return {
    template,
    selectedId,
    selected,
    select: (id) => { selectedId.value = id },
    add,
    update,
    remove,
    setPaper,
    load,
    toJson,
    loadJson,
    dirty,
    markClean,
  }
}
