/**
 * schema.ts 不可变行为的单元测试。
 * 跑: node scripts/build-test.mjs && node --test src/designer/core/__tests__/schema.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addElement,
  createElement,
  createImage,
  createTable,
  createTemplate,
  createText,
  findElement,
  removeElement,
  setPaper,
  updateElement,
} from '../../../../dist-test/schema.mjs'

test('createText 默认值', () => {
  const t = createText()
  assert.equal(t.type, 'text')
  assert.equal(t.text, '文本')
  assert.ok(t.id.startsWith('el_'), 'id 应以 el_ 开头')
})

test('createImage 默认值', () => {
  const i = createImage()
  assert.equal(i.type, 'image')
  assert.equal(i.fit, 'contain')
})

test('createElement 按 type 分发', () => {
  assert.equal(createElement('text').type, 'text')
  assert.equal(createElement('image').type, 'image')
  assert.equal(createElement('table').type, 'table')
  assert.equal(createElement('line').type, 'line')
})

test('createTable 默认 pageBreakBefore=false, rowBreak="row", repeatHeader=true', () => {
  const t = createTable()
  assert.equal(t.pageBreakBefore, false)
  assert.equal(t.rowBreak, 'row')
  assert.equal(t.repeatHeader, true)
  assert.ok(Array.isArray(t.columns) && t.columns.length > 0)
})

test('createTemplate 默认 A4', () => {
  const t = createTemplate()
  assert.deepEqual(t.paper, { width: 210, height: 297 })
  assert.deepEqual(t.elements, [])
  assert.equal(t.version, '1.0')
})

test('updateElement 不可变:返回新对象,不修改原对象', () => {
  const t = createTemplate({ elements: [createText({ text: 'old' })] })
  const id = t.elements[0].id
  const next = updateElement(t, id, { text: 'new' })
  assert.equal(t.elements[0].text, 'old')
  assert.equal(next.elements[0].text, 'new')
  assert.notEqual(t, next)
  assert.notEqual(t.elements, next.elements)
})

test('updateElement 找不到 id 时返回原对象引用', () => {
  const t = createTemplate()
  const next = updateElement(t, 'not-exist', { x: 1 })
  assert.equal(next, t)
})

test('addElement 不可变:追加到末尾', () => {
  const t = createTemplate()
  const el = createText()
  const next = addElement(t, el)
  assert.equal(next.elements.length, 1)
  assert.equal(t.elements.length, 0, '原对象不被修改')
  assert.equal(next.elements[0], el)
})

test('removeElement 不可变:过滤掉指定 id', () => {
  const t = createTemplate({ elements: [createText(), createImage()] })
  const id = t.elements[0].id
  const next = removeElement(t, id)
  assert.equal(next.elements.length, 1)
  assert.equal(t.elements.length, 2, '原对象不被修改')
  assert.equal(next.elements[0].type, 'image')
})

test('setPaper 不可变:替换 paper', () => {
  const t = createTemplate()
  const next = setPaper(t, { width: 100, height: 200 })
  assert.deepEqual(next.paper, { width: 100, height: 200 })
  assert.deepEqual(t.paper, { width: 210, height: 297 })
})

test('findElement 找到则返回,找不到返回 undefined', () => {
  const el = createText()
  const t = createTemplate({ elements: [el] })
  assert.equal(findElement(t, el.id), el)
  assert.equal(findElement(t, 'not-exist'), undefined)
})
