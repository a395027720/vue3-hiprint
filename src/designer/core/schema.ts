/**
 * Template / Element 的不可变更新 helper。
 *
 * 设计原则:不修改原对象,所有更新都返回新对象。这避免 Vue reactive
 * 包装后的隐藏副作用,也让 history(undo/redo)更简单(只存引用)。
 */

import type { Element, ElementType, ElementOfType, ElementPatch, Template } from './types'
import { DEFAULT_FONT_SIZE } from './types'
import { nextId } from './id'

// ========== Factory: 创建元素 ==========

export function createText(overrides: Partial<ElementOfType<'text'>> = {}): ElementOfType<'text'> {
  return {
    id: nextId(),
    type: 'text',
    x: 10,
    y: 10,
    w: 60,
    h: 8,
    text: '文本',
    fontSize: DEFAULT_FONT_SIZE,
    ...overrides,
  }
}

export function createImage(overrides: Partial<ElementOfType<'image'>> = {}): ElementOfType<'image'> {
  return {
    id: nextId(),
    type: 'image',
    x: 10,
    y: 10,
    w: 30,
    h: 30,
    src: '',
    fit: 'contain',
    ...overrides,
  }
}

export function createTable(overrides: Partial<ElementOfType<'table'>> = {}): ElementOfType<'table'> {
  return {
    id: nextId(),
    type: 'table',
    x: 10,
    y: 10,
    w: 180,
    h: 50,
    dataPath: 'rows',
    columns: [
      { field: 'name', title: '名称', width: 60 },
      { field: 'qty', title: '数量', width: 50, align: 'right' },
      { field: 'price', title: '单价', width: 70, align: 'right' },
    ],
    pageBreakBefore: false, // 默认不强制另起一页
    rowBreak: 'row', // 默认行内不跨页
    repeatHeader: true, // 默认跨页重复表头
    fontSize: DEFAULT_FONT_SIZE,
    ...overrides,
  }
}

export function createLine(overrides: Partial<ElementOfType<'line'>> = {}): ElementOfType<'line'> {
  return {
    id: nextId(),
    type: 'line',
    x: 10,
    y: 10,
    w: 50,
    h: 0,
    thickness: 1,
    ...overrides,
  }
}

/** 按 type 分发到对应 factory */
export function createElement(type: ElementType, overrides: Partial<Element> = {}): Element {
  switch (type) {
    case 'text': return createText(overrides as Partial<ElementOfType<'text'>>)
    case 'image': return createImage(overrides as Partial<ElementOfType<'image'>>)
    case 'table': return createTable(overrides as Partial<ElementOfType<'table'>>)
    case 'line': return createLine(overrides as Partial<ElementOfType<'line'>>)
  }
}

// ========== Factory: 创建 Template ==========

export function createTemplate(overrides: Partial<Template> = {}): Template {
  return {
    version: '1.0',
    paper: { width: 210, height: 297 }, // A4
    elements: [],
    ...overrides,
  }
}

// ========== Immutable update ==========

/**
 * 不可变地更新指定 id 的元素。找不到 id 时返回原 Template(不抛错)。
 */
export function updateElement<T extends Element>(
  tpl: Template,
  id: string,
  patch: ElementPatch<T>,
): Template {
  let changed = false
  const next = tpl.elements.map((el) => {
    if (el.id !== id) return el
    changed = true
    return { ...el, ...patch } as Element
  })
  return changed ? { ...tpl, elements: next } : tpl
}

/**
 * 不可变地添加元素(返回新 Template,新元素追加到末尾)。
 */
export function addElement(tpl: Template, el: Element): Template {
  return { ...tpl, elements: [...tpl.elements, el] }
}

/**
 * 不可变地删除元素。
 */
export function removeElement(tpl: Template, id: string): Template {
  return { ...tpl, elements: tpl.elements.filter((el) => el.id !== id) }
}

/**
 * 不可变地替换整个 paper。
 */
export function setPaper(tpl: Template, paper: Template['paper']): Template {
  return { ...tpl, paper: { ...paper } }
}

/**
 * 按 id 查找元素(纯函数,无副作用)。
 */
export function findElement(tpl: Template, id: string): Element | undefined {
  return tpl.elements.find((el) => el.id === id)
}
