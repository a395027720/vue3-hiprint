/**
 * useDesigner — 单一 Composition API 入口。
 *
 * 收敛:模板状态、选中元素、增删改、JSON 导入导出、history、缩放、网格。
 * 不做:UI 渲染(交给 <PrintDesigner> 组件)、拖动事务(MVP:update 不入 history)。
 *
 * 模板用 shallowRef 包,内部用 schema.ts 的 immutable helper 更新。
 * 这样 Vue 不会深度代理整个 element 树(尤其 table 很大时性能更好),
 * 组件侧用 template.value = nextTemplate 整体替换触发响应。
 *
 * ## History 策略
 * add / remove / clearElements / setPaper / load 各自入 history。
 * update **不**自动入 history,因为拖动会产生上百次 mousemove,会让 history
 * 粒度太细。后续 PR 引入"事务"概念,让拖动 mouseup 时一次性 commit。
 */

import { ref, shallowRef, computed, triggerRef } from 'vue'
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
import { History } from '../core/history'
import { nextId as createId } from '../core/id'

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
  /** 不可变更新元素 patch(update 不入 history,后续 PR 用事务) */
  update: (id: string, patch: Partial<Element>) => void
  /** 删除元素(入 history) */
  remove: (id: string) => void
  /** 复制元素(浅复制 + 新 id,入 history) */
  duplicate: (id: string) => void
  /** 元素上移一层(数组顺序 +1,后绘制者在上,入 history) */
  moveUp: (id: string) => void
  /** 元素下移一层(数组顺序 -1,入 history) */
  moveDown: (id: string) => void
  /** 元素置顶(数组末尾,入 history) */
  bringToFront: (id: string) => void
  /** 元素置底(数组开头,入 history) */
  sendToBack: (id: string) => void
  /** 复制元素到剪贴板(不删原,不入 history) */
  copyElement: (id: string) => void
  /** 剪切元素(复制到剪贴板 + 删除,入 history) */
  cutElement: (id: string) => void
  /** 在指定位置粘贴剪贴板元素(若存在,入 history) */
  pasteElement: (atX?: number, atY?: number) => Element | null
  /** 切换/设置锁定状态(入 history) */
  setLocked: (id: string, locked: boolean) => void
  /** 剪贴板是否非空 */
  hasClipboard: ComputedRef<boolean>
  /** 清空全部元素(入 history) */
  clearElements: () => void
  /** 替换 paper(入 history) */
  setPaper: (paper: Template['paper']) => void
  /** 整体替换模板(用于 JSON 导入,入 history) */
  load: (tpl: Template) => void
  /** 导出 JSON 字符串 */
  toJson: () => string
  /** 从 JSON 字符串导入,失败返回 false */
  loadJson: (raw: string) => boolean
  /** dirty 标志 */
  dirty: ComputedRef<boolean>
  /** 标记已保存(清空 dirty) */
  markClean: () => void
  /** 撤销(若 canUndo) */
  undo: () => void
  /** 重做(若 canRedo) */
  redo: () => void
  /** 是否可撤销 */
  canUndo: ComputedRef<boolean>
  /** 是否可重做 */
  canRedo: ComputedRef<boolean>
  /** 画布缩放比例(1 = 100%,0.5 = 50%) */
  zoom: Ref<number>
  /** 设置缩放 */
  setZoom: (z: number) => void
  /** 是否显示网格 */
  showGrid: Ref<boolean>
  /** 切换网格显示 */
  toggleGrid: () => void
}

export function useDesigner(options: UseDesignerOptions = {}): UseDesignerReturn {
  const initial = options.template ?? createTemplate()
  // 用 shallowRef 避免深代理,Template 整体替换
  const template = shallowRef<Template>(initial)
  const selectedId = ref<string | null>(null)
  const lastSaved = shallowRef<Template>(initial)
  const dirty = computed(() => template.value !== lastSaved.value)

  // history counter(用 ref 让 canUndo/canRedo 响应式)
  const histCount = ref({ past: 0, future: 0 })
  const canUndo = computed(() => histCount.value.past > 0)
  const canRedo = computed(() => histCount.value.future > 0)
  const history = new History<Template>({
    getCurrent: () => template.value,
    setCurrent: (v) => {
      template.value = v
      // shallowRef 内部值引用变了需要 trigger 让 computed 重新计算
      triggerRef(template)
    },
  })

  const zoom = ref(1)
  const showGrid = ref(false)

  const selected = computed<Element | null>(() =>
    selectedId.value ? findElement(template.value, selectedId.value) ?? null : null,
  )

  /** 把 newTpl 提交为"下一个状态",History 自动把 current 入 past + setCurrent(new)。 */
  function commit(newTpl: Template): void {
    history.commit(newTpl)
    histCount.value = { past: history.pastSize, future: history.futureSize }
  }

  function add(type: ElementType): Element {
    const tpl = template.value
    const el = createElement(type, {
      x: Math.max(0, (tpl.paper.width - 60) / 2),
      y: Math.max(0, (tpl.paper.height - 20) / 2),
    })
    commit(addEl(tpl, el))
    selectedId.value = el.id
    return el
  }

  function update(id: string, patch: Partial<Element>): void {
    // update 不入 history(拖动事务,后续 PR)
    template.value = updateEl(template.value, id, patch as never)
  }

  function remove(id: string): void {
    commit(removeEl(template.value, id))
    if (selectedId.value === id) selectedId.value = null
  }

  function duplicate(id: string): void {
    const tpl = template.value
    const idx = tpl.elements.findIndex((e) => e.id === id)
    if (idx < 0) return
    const src = tpl.elements[idx]
    const copy = { ...src, id: createId(), x: src.x + 4, y: src.y + 4 } as typeof src
    const next = { ...tpl, elements: [...tpl.elements, copy] }
    commit(next)
    selectedId.value = copy.id
  }

  function moveUp(id: string): void {
    const tpl = template.value
    const idx = tpl.elements.findIndex((e) => e.id === id)
    if (idx < 0 || idx === tpl.elements.length - 1) return
    const next = [...tpl.elements]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    commit({ ...tpl, elements: next })
  }

  function moveDown(id: string): void {
    const tpl = template.value
    const idx = tpl.elements.findIndex((e) => e.id === id)
    if (idx <= 0) return
    const next = [...tpl.elements]
    ;[next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
    commit({ ...tpl, elements: next })
  }

  function bringToFront(id: string): void {
    const tpl = template.value
    const idx = tpl.elements.findIndex((e) => e.id === id)
    if (idx < 0 || idx === tpl.elements.length - 1) return
    const el = tpl.elements[idx]
    commit({ ...tpl, elements: [...tpl.elements.filter((x) => x.id !== id), el] })
  }

  function sendToBack(id: string): void {
    const tpl = template.value
    const idx = tpl.elements.findIndex((e) => e.id === id)
    if (idx <= 0) return
    const el = tpl.elements[idx]
    commit({ ...tpl, elements: [el, ...tpl.elements.filter((x) => x.id !== id)] })
  }

  // 剪贴板(只放一份元素的不可变快照,粘贴时给新 id)
  const clipboard = shallowRef<Element | null>(null)
  const hasClipboard = computed(() => clipboard.value != null)

  function copyElement(id: string): void {
    const el = findElement(template.value, id)
    if (el) clipboard.value = el
  }

  function cutElement(id: string): void {
    copyElement(id)
    remove(id)
  }

  function pasteElement(atX?: number, atY?: number): Element | null {
    const src = clipboard.value
    if (!src) return null
    const dx = atX != null ? atX - src.x : 8
    const dy = atY != null ? atY - src.y : 8
    const copy = { ...src, id: createId(), x: src.x + dx, y: src.y + dy } as typeof src
    commit(addEl(template.value, copy))
    selectedId.value = copy.id
    return copy
  }

  function setLocked(id: string, locked: boolean): void {
    const tpl = template.value
    const next = tpl.elements.map((e) => (e.id === id ? { ...e, locked } : e))
    commit({ ...tpl, elements: next })
  }

  function clearElements(): void {
    if (template.value.elements.length === 0) return
    commit({ ...template.value, elements: [] })
    selectedId.value = null
  }

  function setPaper(paper: Template['paper']): void {
    commit(setPaperHelper(template.value, paper))
  }

  function load(tpl: Template): void {
    commit(tpl)
    selectedId.value = null
  }

  function undo(): void {
    history.undo()
    histCount.value = { past: history.pastSize, future: history.futureSize }
  }

  function redo(): void {
    history.redo()
    histCount.value = { past: history.pastSize, future: history.futureSize }
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

  function setZoom(z: number): void {
    zoom.value = Math.max(0.25, Math.min(4, z))
  }

  function toggleGrid(): void {
    showGrid.value = !showGrid.value
  }

  return {
    template,
    selectedId,
    selected,
    select: (id) => { selectedId.value = id },
    add,
    update,
    remove,
    duplicate,
    moveUp,
    moveDown,
    bringToFront,
    sendToBack,
    copyElement,
    cutElement,
    pasteElement,
    setLocked,
    hasClipboard,
    clearElements,
    setPaper,
    load,
    toJson,
    loadJson,
    dirty,
    markClean,
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    setZoom,
    showGrid,
    toggleGrid,
  }
}

