/**
 * align.ts 对齐工具测试。
 * 拆成水平(alignHorizontal) / 垂直(alignVertical) 两个 API。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTemplate, createText } from '../../../../dist-test/schema.mjs'
import {
  alignHorizontal,
  alignVertical,
} from '../../../../dist-test/align.mjs'

const tpl = () =>
  createTemplate({ elements: [createText({ x: 50, y: 60, w: 30, h: 10 })] })

// ========== 水平 ==========

test('alignHorizontal left: x = 0', () => {
  const t = tpl()
  const next = alignHorizontal(t, t.elements[0].id, 'left')
  assert.equal(next.elements[0].x, 0)
  assert.equal(next.elements[0].y, 60, 'y 不变')
})

test('alignHorizontal center: x = (paper.w - el.w) / 2', () => {
  const t = tpl()
  const next = alignHorizontal(t, t.elements[0].id, 'center')
  assert.equal(next.elements[0].x, (210 - 30) / 2)
})

test('alignHorizontal right: x = paper.w - el.w', () => {
  const t = tpl()
  const next = alignHorizontal(t, t.elements[0].id, 'right')
  assert.equal(next.elements[0].x, 210 - 30)
})

// ========== 垂直 ==========

test('alignVertical top: y = 0', () => {
  const t = tpl()
  const next = alignVertical(t, t.elements[0].id, 'top')
  assert.equal(next.elements[0].y, 0)
  assert.equal(next.elements[0].x, 50, 'x 不变')
})

test('alignVertical middle: y = (paper.h - el.h) / 2', () => {
  const t = tpl()
  const next = alignVertical(t, t.elements[0].id, 'middle')
  assert.equal(next.elements[0].y, (297 - 10) / 2)
})

test('alignVertical bottom: y = paper.h - el.h', () => {
  const t = tpl()
  const next = alignVertical(t, t.elements[0].id, 'bottom')
  assert.equal(next.elements[0].y, 297 - 10)
})

// ========== 通用 ==========

test('align 找不到 id 返回原对象', () => {
  const t = tpl()
  assert.equal(alignHorizontal(t, 'not-exist', 'left'), t)
  assert.equal(alignVertical(t, 'not-exist', 'top'), t)
})

test('align 不可变:不修改原 Template', () => {
  const t = tpl()
  const id = t.elements[0].id
  alignHorizontal(t, id, 'left')
  alignVertical(t, id, 'top')
  assert.equal(t.elements[0].x, 50)
  assert.equal(t.elements[0].y, 60)
})
