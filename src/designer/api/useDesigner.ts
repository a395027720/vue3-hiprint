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
 *
 * ## 多页支持
 * Template.pages: Page[];所有 mutator 方法接受 pageIndex 参数(默认 0)。
 * S2 阶段:emit 协议保持 string[],DesignerCanvas 内部 findElementGlobal
 * 反查 pageIndex 后再调 store;S3+ 再扩展为 {id, pageIndex} 协议。
 */

import { ref, shallowRef, computed, triggerRef } from 'vue'
import type { Ref, ComputedRef } from 'vue'

import type { Element, ElementType, Template } from '../core/types'
import {
  addElement as addEl,
  allElements,
  createElement,
  createTemplate,
  findElementGlobal,
  removeElement as removeEl,
  setPaper as setPaperHelper,
  updateElement as updateEl,
} from '../core/schema'
import { History } from '../core/history'
import { nextId as createId } from '../core/id'
import { alignHorizontal, alignVertical } from '../core/align'

/** 用户自定义参考线 */
export interface Guide {
  id: string
  axis: 'horizontal' | 'vertical'
  /** 全局 mm 坐标(相对当前 paper 0,0) */
  position: number
  color?: string
}

export interface UseDesignerOptions {
  /** 初始模板(可选,默认空白 A4) */
  template?: Template
  /** 是否有未保存修改 */
  onDirtyChange?: (dirty: boolean) => void
}

export interface UseDesignerReturn {
  /** 当前模板(整体替换触发响应) */
  template: Ref<Template>
  /** 当前活动 pageIndex(默认 0) */
  currentPageIndex: Ref<number>
  /** 选中元素的 id(主选,空 = 0 个或 ≥2 个) */
  selectedId: Ref<string | null>
  /** 多选 id 列表(单选时也含 1 个;空 = 无选中) */
  multiSelectedIds: Ref<string[]>
  /** 选中元素(只读) */
  selected: ComputedRef<Element | null>
  /** 选中元素 id(响应式 set) */
  select: (id: string | null) => void
  /** 框选:批量选中,单选时同步 selectedId */
  selectMany: (ids: string[]) => void
  /** Shift+点击:在多选集合里 toggle 一个;并把它设为主选 */
  toggleInMulti: (id: string) => void
  /** 清空所有选中(主选 + 多选) */
  clearSelection: () => void
  /** 批量删除(入 history) */
  removeMany: (ids: string[]) => void
  /** 批量移动(连续触发,不入 history) */
  moveMany: (updates: Array<{ id: string; x: number; y: number }>) => void
  /** 添加新元素(在画布中央,或指定 mm 位置) */
  add: (type: ElementType, pageIndex?: number, position?: { x: number; y: number }) => Element
  /** 不可变更新元素 patch(update 不入 history,后续 PR 用事务) */
  update: (id: string, patch: Partial<Element>, pageIndex?: number) => void
  /** 删除元素(入 history) */
  remove: (id: string, pageIndex?: number) => void
  /** 复制元素(浅复制 + 新 id,入 history) */
  duplicate: (id: string, pageIndex?: number) => void
  /** 元素上移一层(数组顺序 +1,后绘制者在上,入 history) */
  moveUp: (id: string, pageIndex?: number) => void
  /** 元素下移一层(数组顺序 -1,入 history) */
  moveDown: (id: string, pageIndex?: number) => void
  /** 元素置顶(数组末尾,入 history) */
  bringToFront: (id: string, pageIndex?: number) => void
  /** 元素置底(数组开头,入 history) */
  sendToBack: (id: string, pageIndex?: number) => void
  /** 复制元素到剪贴板(不删原,不入 history) */
  copyElement: (id: string) => void
  /** 剪切元素(复制到剪贴板 + 删除,入 history) */
  cutElement: (id: string, pageIndex?: number) => void
  /** 在指定位置粘贴剪贴板元素(若存在,入 history) */
  pasteElement: (atX?: number, atY?: number, pageIndex?: number) => Element | null
  /** 切换/设置锁定状态(入 history) */
  setLocked: (id: string, locked: boolean, pageIndex?: number) => void
  /** 切换主选元素的锁定状态(快捷) */
  toggleLock: () => void
  /** 剪贴板是否非空 */
  hasClipboard: ComputedRef<boolean>
  /** 当前页全选 */
  selectAllElements: () => void
  /** 多选对齐(单选时退化为单元素对齐) */
  alignSelectedElements: (
    mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
  ) => void
  /** 多选等距分布(沿 axis 排列) */
  distributeSelectedElements: (axis: 'horizontal' | 'vertical') => void
  /** 多选尺寸匹配(以主选 w/h 为基准) */
  matchSelectedElementsSize: (mode: 'width' | 'height' | 'both') => void
  /** 删除当前多选(快捷) */
  deleteSelection: () => void
  /** 清空全部元素(入 history,跨所有 pages) */
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
  /** 全部 guides(用户自定义参考线) */
  guides: Ref<Guide[]>
  /** 当前高亮的 guide(hover) */
  highlightedGuideId: Ref<string | null>
  /** 新建 guide(入 history) */
  addGuide: (axis: 'horizontal' | 'vertical', position: number) => void
  /** 更新 guide(入 history) */
  updateGuide: (id: string, patch: Partial<Guide>) => void
  /** 删除 guide(入 history) */
  removeGuide: (id: string) => void
  /** 高亮 guide(不入 history) */
  setHighlightedGuide: (id: string | null) => void
}

export function useDesigner(options: UseDesignerOptions = {}): UseDesignerReturn {
  const initial = options.template ?? createTemplate()
  // 兼容老 JSON(无 pages):自动迁移
  const normalized: Template =
    initial.pages && initial.pages.length > 0
      ? initial
      : { ...initial, pages: [{ id: createId(), elements: (initial as unknown as { elements?: Element[] }).elements ?? [] }] }
  // 用 shallowRef 避免深代理,Template 整体替换
  const template = shallowRef<Template>(normalized)
  const currentPageIndex = ref(0)
  const selectedId = ref<string | null>(null)
  const lastSaved = shallowRef<Template>(normalized)
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

  // 用户自定义参考线(独立 ref,不入 history;后续可迁移到 Template.guides)
  const guides = ref<Guide[]>([])
  const highlightedGuideId = ref<string | null>(null)
  function addGuide(axis: 'horizontal' | 'vertical', position: number): void {
    guides.value = [
      ...guides.value,
      { id: createId(), axis, position, color: '#1677ff' },
    ]
  }
  function updateGuide(id: string, patch: Partial<Guide>): void {
    guides.value = guides.value.map((g) => (g.id === id ? { ...g, ...patch } : g))
  }
  function removeGuide(id: string): void {
    guides.value = guides.value.filter((g) => g.id !== id)
    if (highlightedGuideId.value === id) highlightedGuideId.value = null
  }
  function setHighlightedGuide(id: string | null): void {
    highlightedGuideId.value = id
  }

  /** 跨所有 pages 找元素所在 pageIndex(找不到返回 -1) */
  function resolvePageIndex(id: string): number {
    return findElementGlobal(template.value, id)?.pageIndex ?? -1
  }

  const selected = computed<Element | null>(() => {
    if (!selectedId.value) return null
    const found = findElementGlobal(template.value, selectedId.value)
    return found?.el ?? null
  })

  // 多选:单选时也走 multi(便于上层统一处理)。
  // 约定:selectedId 是 handles / 属性面板用的"主选";"primary" 始终是最后点中的。
  const multiSelectedIds = ref<string[]>([])

  function select(id: string | null): void {
    selectedId.value = id
    multiSelectedIds.value = id ? [id] : []
  }

  function selectMany(ids: string[]): void {
    // 按所有 pages 的 elements 数组顺序排 ids,这样 handles / 主选更稳定
    const order = new Set(allElements(template.value).map((e) => e.id))
    const sorted = ids.filter((id) => order.has(id))
    // 把 ids 里不在 template 里的也保留(防御性)
    for (const id of ids) if (!sorted.includes(id)) sorted.push(id)
    multiSelectedIds.value = sorted
    selectedId.value = sorted.length === 1 ? sorted[0]! : null
  }

  function toggleInMulti(id: string): void {
    if (multiSelectedIds.value.includes(id)) {
      const next = multiSelectedIds.value.filter((x) => x !== id)
      multiSelectedIds.value = next
      if (selectedId.value === id) selectedId.value = next[0] ?? null
    } else {
      multiSelectedIds.value = [...multiSelectedIds.value, id]
      selectedId.value = id
    }
  }

  function clearSelection(): void {
    selectedId.value = null
    multiSelectedIds.value = []
  }

  function removeMany(ids: string[]): void {
    if (ids.length === 0) return
    const tpl = template.value
    const idSet = new Set(ids)
    const nextPages = tpl.pages.map((p) => ({
      ...p,
      elements: p.elements.filter((e) => !idSet.has(e.id)),
    }))
    commit({ ...tpl, pages: nextPages })
    multiSelectedIds.value = multiSelectedIds.value.filter((id) => !idSet.has(id))
    if (selectedId.value && idSet.has(selectedId.value)) selectedId.value = null
  }

  function moveMany(updates: Array<{ id: string; x: number; y: number }>): void {
    if (updates.length === 0) return
    const tpl = template.value
    const map = new Map(updates.map((u) => [u.id, u]))
    // 按 pageIndex 分桶,避免单 page 重建整个 pages
    const updatedByPage = new Map<number, Map<string, { x: number; y: number }>>()
    for (const u of updates) {
      const pi = resolvePageIndex(u.id)
      if (pi < 0) continue
      if (!updatedByPage.has(pi)) updatedByPage.set(pi, new Map())
      updatedByPage.get(pi)!.set(u.id, u)
    }
    const nextPages = tpl.pages.map((p, i) => {
      const m = updatedByPage.get(i)
      if (!m) return p
      return { ...p, elements: p.elements.map((e) => {
        const u = m.get(e.id)
        return u ? { ...e, x: u.x, y: u.y } : e
      }) }
    })
    // 连续触发,不入 history
    template.value = { ...tpl, pages: nextPages }
  }

  /** undo / redo / 外部修改 template 后,清掉多选里已不存在的 id */
  function pruneSelection(): void {
    const ids = new Set(allElements(template.value).map((e) => e.id))
    multiSelectedIds.value = multiSelectedIds.value.filter((id) => ids.has(id))
    if (selectedId.value && !ids.has(selectedId.value)) {
      selectedId.value = multiSelectedIds.value[0] ?? null
    }
  }

  /** 把 newTpl 提交为"下一个状态",History 自动把 current 入 past + setCurrent(new)。 */
  function commit(newTpl: Template): void {
    history.commit(newTpl)
    histCount.value = { past: history.pastSize, future: history.futureSize }
  }

  function add(
    type: ElementType,
    pageIndex?: number,
    position?: { x: number; y: number },
  ): Element {
    const tpl = template.value
    const pi = pageIndex ?? currentPageIndex.value
    // 默认居中;拖入时按 position 落点(左上角,留默认 w/h,clamp 到画布内)
    const fallbackX = Math.max(0, (tpl.paper.width - 60) / 2)
    const fallbackY = Math.max(0, (tpl.paper.height - 20) / 2)
    const x = position
      ? Math.max(0, Math.min(tpl.paper.width - 4, position.x))
      : fallbackX
    const y = position
      ? Math.max(0, Math.min(tpl.paper.height - 4, position.y))
      : fallbackY
    const el = createElement(type, { x, y })
    commit(addEl(tpl, pi, el))
    selectedId.value = el.id
    return el
  }

  function update(id: string, patch: Partial<Element>, pageIndex?: number): void {
    // update 不入 history(拖动事务,后续 PR)
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    template.value = updateEl(template.value, pi, id, patch as never)
  }

  function remove(id: string, pageIndex?: number): void {
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    commit(removeEl(template.value, pi, id))
    if (selectedId.value === id) selectedId.value = null
  }

  function duplicate(id: string, pageIndex?: number): void {
    const tpl = template.value
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    const page = tpl.pages[pi]
    if (!page) return
    const src = page.elements.find((e) => e.id === id)
    if (!src) return
    const copy = { ...src, id: createId(), x: src.x + 4, y: src.y + 4 } as typeof src
    commit(addEl(tpl, pi, copy))
    selectedId.value = copy.id
  }

  function moveUp(id: string, pageIndex?: number): void {
    const tpl = template.value
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    const page = tpl.pages[pi]
    if (!page) return
    const idx = page.elements.findIndex((e) => e.id === id)
    if (idx < 0 || idx === page.elements.length - 1) return
    const next = [...page.elements]
    ;[next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!]
    commit({
      ...tpl,
      pages: tpl.pages.map((p, i) => (i === pi ? { ...p, elements: next } : p)),
    })
  }

  function moveDown(id: string, pageIndex?: number): void {
    const tpl = template.value
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    const page = tpl.pages[pi]
    if (!page) return
    const idx = page.elements.findIndex((e) => e.id === id)
    if (idx <= 0) return
    const next = [...page.elements]
    ;[next[idx], next[idx - 1]] = [next[idx - 1]!, next[idx]!]
    commit({
      ...tpl,
      pages: tpl.pages.map((p, i) => (i === pi ? { ...p, elements: next } : p)),
    })
  }

  function bringToFront(id: string, pageIndex?: number): void {
    const tpl = template.value
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    const page = tpl.pages[pi]
    if (!page) return
    const idx = page.elements.findIndex((e) => e.id === id)
    if (idx < 0 || idx === page.elements.length - 1) return
    const el = page.elements[idx]!
    commit({
      ...tpl,
      pages: tpl.pages.map((p, i) =>
        i === pi ? { ...p, elements: [...p.elements.filter((x) => x.id !== id), el] } : p,
      ),
    })
  }

  function sendToBack(id: string, pageIndex?: number): void {
    const tpl = template.value
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    const page = tpl.pages[pi]
    if (!page) return
    const idx = page.elements.findIndex((e) => e.id === id)
    if (idx <= 0) return
    const el = page.elements[idx]!
    commit({
      ...tpl,
      pages: tpl.pages.map((p, i) =>
        i === pi ? { ...p, elements: [el, ...p.elements.filter((x) => x.id !== id)] } : p,
      ),
    })
  }

  // 剪贴板(只放一份元素的不可变快照,粘贴时给新 id)
  const clipboard = shallowRef<Element | null>(null)
  const hasClipboard = computed(() => clipboard.value != null)

  function copyElement(id: string): void {
    const found = findElementGlobal(template.value, id)
    if (found) clipboard.value = found.el
  }

  function cutElement(id: string, pageIndex?: number): void {
    copyElement(id)
    remove(id, pageIndex)
  }

  function pasteElement(atX?: number, atY?: number, pageIndex?: number): Element | null {
    const src = clipboard.value
    if (!src) return null
    const pi = pageIndex ?? currentPageIndex.value
    const dx = atX != null ? atX - src.x : 8
    const dy = atY != null ? atY - src.y : 8
    const copy = { ...src, id: createId(), x: src.x + dx, y: src.y + dy } as typeof src
    commit(addEl(template.value, pi, copy))
    selectedId.value = copy.id
    return copy
  }

  function setLocked(id: string, locked: boolean, pageIndex?: number): void {
    const tpl = template.value
    const pi = pageIndex ?? resolvePageIndex(id)
    if (pi < 0) return
    commit({
      ...tpl,
      pages: tpl.pages.map((p, i) =>
        i === pi
          ? { ...p, elements: p.elements.map((e) => (e.id === id ? { ...e, locked } : e)) }
          : p,
      ),
    })
  }

  function toggleLock(): void {
    const id = selectedId.value
    if (!id) return
    const found = findElementGlobal(template.value, id)
    if (!found) return
    setLocked(id, !found.el.locked, found.pageIndex)
  }

  function selectAllElements(): void {
    const page = template.value.pages[currentPageIndex.value]
    if (!page) return
    const ids = page.elements.filter((e) => !e.locked).map((e) => e.id)
    if (ids.length === 0) return
    selectMany(ids)
  }

  function alignSelectedElements(
    mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
  ): void {
    const ids = multiSelectedIds.value
    if (ids.length === 0) return
    let tpl = template.value
    for (const id of ids) {
      if (mode === 'left' || mode === 'center' || mode === 'right') {
        tpl = alignHorizontal(tpl, id, mode)
      } else {
        tpl = alignVertical(tpl, id, mode)
      }
    }
    commit(tpl)
  }

  function distributeSelectedElements(axis: 'horizontal' | 'vertical'): void {
    const ids = multiSelectedIds.value
    if (ids.length < 3) return
    const items = ids
      .map((id) => findElementGlobal(template.value, id))
      .filter((f): f is { pageIndex: number; el: Element } => !!f)
      // 等距分布只在同一页有意义
      .filter((f) => f.pageIndex === currentPageIndex.value)
      .map((f) => f.el)
    if (items.length < 3) return
    items.sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y))
    const first = items[0]!
    const last = items[items.length - 1]!
    const start = axis === 'horizontal' ? first.x : first.y
    const end = axis === 'horizontal' ? last.x : last.y
    const step = (end - start) / (items.length - 1)
    let tpl = template.value
    for (let i = 1; i < items.length - 1; i++) {
      const cur = items[i]!
      const v = start + step * i
      tpl = updateEl(tpl, currentPageIndex.value, cur.id, (
        axis === 'horizontal' ? { x: v } : { y: v }
      ) as never)
    }
    commit(tpl)
  }

  function matchSelectedElementsSize(mode: 'width' | 'height' | 'both'): void {
    const ids = multiSelectedIds.value
    if (ids.length < 2) return
    const primary = selected.value
    if (!primary) return
    const patch: Partial<Element> = {}
    if (mode === 'width' || mode === 'both') patch.w = primary.w
    if (mode === 'height' || mode === 'both') patch.h = primary.h
    if (Object.keys(patch).length === 0) return
    let tpl = template.value
    for (const id of ids) {
      if (id === primary.id) continue
      const found = findElementGlobal(tpl, id)
      if (!found) continue
      tpl = updateEl(tpl, found.pageIndex, id, patch as never)
    }
    commit(tpl)
  }

  function deleteSelection(): void {
    const ids = multiSelectedIds.value
    if (ids.length === 0) return
    removeMany(ids)
  }

  function clearElements(): void {
    if (allElements(template.value).length === 0) return
    commit({
      ...template.value,
      pages: template.value.pages.map((p) => ({ ...p, elements: [] })),
    })
    clearSelection()
  }

  function setPaper(paper: Template['paper']): void {
    commit(setPaperHelper(template.value, paper))
  }

  function load(tpl: Template): void {
    commit(tpl)
    clearSelection()
  }

  function undo(): void {
    history.undo()
    histCount.value = { past: history.pastSize, future: history.futureSize }
    pruneSelection()
  }

  function redo(): void {
    history.redo()
    histCount.value = { past: history.pastSize, future: history.futureSize }
    pruneSelection()
  }

  function toJson(): string {
    return JSON.stringify(template.value, null, 2)
  }

  function loadJson(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw) as Template & { elements?: Element[] }
      if (!parsed || parsed.version !== '1.0' || !parsed.paper) return false
      // 兼容老格式(无 pages,有 elements):迁移到 pages
      let next: Template
      if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        next = parsed
      } else if (Array.isArray(parsed.elements)) {
        next = {
          version: '1.0',
          paper: parsed.paper,
          pages: [{ id: createId(), elements: parsed.elements }],
        }
      } else {
        return false
      }
      load(next)
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
    currentPageIndex,
    selectedId,
    multiSelectedIds,
    selected,
    select,
    selectMany,
    toggleInMulti,
    clearSelection,
    removeMany,
    moveMany,
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
    toggleLock,
    hasClipboard,
    selectAllElements,
    alignSelectedElements,
    distributeSelectedElements,
    matchSelectedElementsSize,
    deleteSelection,
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
    guides,
    highlightedGuideId,
    addGuide,
    updateGuide,
    removeGuide,
    setHighlightedGuide,
  }
}
