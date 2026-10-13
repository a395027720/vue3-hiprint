/**
 * render.ts 渲染测试。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTable, createTemplate } from '../../../../dist-test/schema.mjs'
import {
  renderTemplate,
  mmToPx,
  resolveDataPath,
} from '../../../../dist-test/render.mjs'

test('mmToPx 1mm ≈ 3.78px', () => {
  assert.ok(Math.abs(mmToPx(1) - 3.78) < 0.01)
  assert.equal(Math.round(mmToPx(25.4) * 100) / 100, 96)
})

test('resolveDataPath 点路径解析', () => {
  const data = { a: { b: { c: 42 } }, rows: [{ x: 1 }] }
  assert.equal(resolveDataPath(data, 'a.b.c'), 42)
  assert.equal(resolveDataPath(data, 'rows'), data.rows)
  assert.equal(resolveDataPath(data, 'a.b.c.d'), undefined)
  assert.equal(resolveDataPath(data, 'missing.path'), undefined)
})

test('renderTemplate 输出 HTML 文档结构', () => {
  const tpl = createTemplate({ elements: [] })
  const html = renderTemplate(tpl, {})
  assert.ok(html.startsWith('<!doctype html>'))
  assert.ok(html.includes('@page'))
  assert.ok(html.includes(`size: ${tpl.paper.width}mm`))
})

test('renderTemplate 包含表格分页 CSS', () => {
  const tpl = createTemplate({ elements: [] })
  const html = renderTemplate(tpl, {})
  assert.ok(html.includes('.el-table-repeat-header'))
  assert.ok(html.includes('.el-table-rowbreak-row'))
  assert.ok(html.includes('page-break-inside: avoid'))
})

test('renderTemplate 表格 pageBreakBefore=true 分配到第二个 paper', () => {
  const tpl = createTemplate({
    elements: [createTable({ pageBreakBefore: true, dataPath: 'rows' })],
  })
  const html = renderTemplate(tpl, { rows: [{ name: 'A', qty: 1, price: 10 }] })
  // 应该有 2 个 paper section
  const paperCount = (html.match(/class="paper"/g) || []).length
  assert.equal(paperCount, 2)
  // 第二个 paper 包含 page-break-after:auto(最后一个不强制分页)
  // 第一个 paper 应该 page-break-after:always
  assert.ok(html.includes('page-break-after:always'))
  assert.ok(html.includes('page-break-after:auto'))
  // 包含表格
  assert.ok(html.includes('el-table'))
})

test('renderTemplate 默认单 paper,无 pageBreakBefore', () => {
  const tpl = createTemplate({
    elements: [createTable({ dataPath: 'rows' })],
  })
  const html = renderTemplate(tpl, { rows: [] })
  // 只有 1 个 paper
  const paperCount = (html.match(/class="paper"/g) || []).length
  assert.equal(paperCount, 1)
})

test('renderTemplate 表格行数据从 data[dataPath] 取', () => {
  const tpl = createTemplate({
    elements: [createTable({ dataPath: 'items' })],
  })
  const data = { items: [
    { name: '商品 A', qty: 2, price: 100 },
    { name: '商品 B', qty: 1, price: 50 },
  ] }
  const html = renderTemplate(tpl, data)
  assert.ok(html.includes('商品 A'))
  assert.ok(html.includes('商品 B'))
  assert.ok(html.includes('100'))
})

test('renderTemplate 表格行内不跨页 class', () => {
  const tpl = createTemplate({
    elements: [createTable({ rowBreak: 'row' })],
  })
  const html = renderTemplate(tpl, { rows: [] })
  assert.ok(html.includes('el-table-rowbreak-row'))
})

test('renderTemplate 表格跨页重复表头 class', () => {
  const tpl = createTemplate({
    elements: [createTable({ repeatHeader: true })],
  })
  const html = renderTemplate(tpl, { rows: [] })
  assert.ok(html.includes('el-table-repeat-header'))
})
