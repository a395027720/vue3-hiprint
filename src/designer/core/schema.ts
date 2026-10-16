/**
 * Template / Element 的不可变更新 helper。
 *
 * 设计原则:不修改原对象,所有更新都返回新对象。这避免 Vue reactive
 * 包装后的隐藏副作用,也让 history(undo/redo)更简单(只存引用)。
 */

import type { Element, ElementType, ElementOfType, ElementPatch, Page, Template } from './types'
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
    showTitle: true,
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

export function createPageNum(overrides: Partial<ElementOfType<'pagenum'>> = {}): ElementOfType<'pagenum'> {
  return {
    id: nextId(),
    type: 'pagenum',
    x: 10,
    y: 10,
    w: 60,
    h: 8,
    format: '第 {page} 页 / 共 {total} 页',
    fontSize: DEFAULT_FONT_SIZE,
    ...overrides,
  }
}

export function createBarcode(overrides: Partial<ElementOfType<'barcode'>> = {}): ElementOfType<'barcode'> {
  return {
    id: nextId(),
    type: 'barcode',
    x: 10,
    y: 10,
    w: 50,
    h: 20,
    value: '12345678',
    symbology: 'code128',
    ...overrides,
  }
}

export function createQrcode(overrides: Partial<ElementOfType<'qrcode'>> = {}): ElementOfType<'qrcode'> {
  return {
    id: nextId(),
    type: 'qrcode',
    x: 10,
    y: 10,
    w: 30,
    h: 30,
    value: 'https://example.com',
    errorLevel: 'M',
    ...overrides,
  }
}

export function createMultiLabel(overrides: Partial<ElementOfType<'multilabel'>> = {}): ElementOfType<'multilabel'> {
  return {
    id: nextId(),
    type: 'multilabel',
    x: 10,
    y: 10,
    w: 60,
    h: 20,
    labels: [
      { text: '标签1' },
      { text: '标签2' },
      { text: '标签3' },
      { text: '标签4' },
    ],
    cols: 2,
    fontSize: DEFAULT_FONT_SIZE,
    ...overrides,
  }
}

export function createRect(overrides: Partial<ElementOfType<'rect'>> = {}): ElementOfType<'rect'> {
  return {
    id: nextId(),
    type: 'rect',
    x: 10,
    y: 10,
    w: 30,
    h: 20,
    fill: '#e6f4ff',
    ...overrides,
  }
}

export function createCircle(overrides: Partial<ElementOfType<'circle'>> = {}): ElementOfType<'circle'> {
  return {
    id: nextId(),
    type: 'circle',
    x: 10,
    y: 10,
    w: 30,
    h: 30,
    fill: '#1677ff',
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
    case 'pagenum': return createPageNum(overrides as Partial<ElementOfType<'pagenum'>>)
    case 'barcode': return createBarcode(overrides as Partial<ElementOfType<'barcode'>>)
    case 'qrcode': return createQrcode(overrides as Partial<ElementOfType<'qrcode'>>)
    case 'multilabel': return createMultiLabel(overrides as Partial<ElementOfType<'multilabel'>>)
    case 'rect': return createRect(overrides as Partial<ElementOfType<'rect'>>)
    case 'circle': return createCircle(overrides as Partial<ElementOfType<'circle'>>)
  }
}

// ========== Factory: 创建 Template ==========

/** 创建一页空 Page(id 唯一,elements 为空) */
export function createPage(overrides: Partial<Page> = {}): Page {
  return {
    id: nextId(),
    elements: [],
    ...overrides,
  }
}

/** 创建默认模板(1 页 A4) */
export function createTemplate(overrides: Partial<Template> = {}): Template {
  return {
    version: '1.0',
    paper: { width: 210, height: 297 }, // A4
    pages: [createPage()],
    ...overrides,
  }
}

// ========== Immutable update ==========

/**
 * 不可变地更新指定 page 的指定 id 元素。找不到时返回原 Template(不抛错)。
 */
export function updateElement<T extends Element>(
  tpl: Template,
  pageIndex: number,
  id: string,
  patch: ElementPatch<T>,
): Template {
  const page = tpl.pages[pageIndex]
  if (!page) return tpl
  let changed = false
  const nextElements = page.elements.map((el) => {
    if (el.id !== id) return el
    changed = true
    return { ...el, ...patch } as Element
  })
  if (!changed) return tpl
  return {
    ...tpl,
    pages: tpl.pages.map((p, i) => (i === pageIndex ? { ...p, elements: nextElements } : p)),
  }
}

/**
 * 不可变地添加元素到指定 page 末尾。
 */
export function addElement(tpl: Template, pageIndex: number, el: Element): Template {
  const page = tpl.pages[pageIndex]
  if (!page) return tpl
  return {
    ...tpl,
    pages: tpl.pages.map((p, i) =>
      i === pageIndex ? { ...p, elements: [...p.elements, el] } : p,
    ),
  }
}

/**
 * 不可变地删除指定 page 的指定 id 元素。
 */
export function removeElement(tpl: Template, pageIndex: number, id: string): Template {
  const page = tpl.pages[pageIndex]
  if (!page) return tpl
  return {
    ...tpl,
    pages: tpl.pages.map((p, i) =>
      i === pageIndex ? { ...p, elements: p.elements.filter((el) => el.id !== id) } : p,
    ),
  }
}

/**
 * 不可变地替换整个 paper。
 */
export function setPaper(tpl: Template, paper: Template['paper']): Template {
  return { ...tpl, paper: { ...paper } }
}

/**
 * 在指定 page 内按 id 查找元素。
 */
export function findElement(tpl: Template, pageIndex: number, id: string): Element | undefined {
  return tpl.pages[pageIndex]?.elements.find((el) => el.id === id)
}

/**
 * 跨所有 pages 按 id 查找元素,返回 { pageIndex, el } 或 null。
 */
export function findElementGlobal(
  tpl: Template,
  id: string,
): { pageIndex: number; el: Element } | null {
  for (let i = 0; i < tpl.pages.length; i++) {
    const el = tpl.pages[i].elements.find((e) => e.id === id)
    if (el) return { pageIndex: i, el }
  }
  return null
}

/**
 * 跨所有 pages 收集所有元素(flat)。供跨页吸附 / 框选 / 延长线穿透用。
 */
export function allElements(tpl: Template): Element[] {
  return tpl.pages.flatMap((p) => p.elements)
}
