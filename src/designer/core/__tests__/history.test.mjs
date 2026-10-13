/**
 * history.ts 撤销/重做的单元测试。
 * 跑: node scripts/build-test.mjs && node --test src/designer/core/__tests__/history.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { History } from '../../../../dist-test/history.mjs'

/** 构造一个 History 实例,内部 state 由外部闭包持有 */
function makeHistory(limit) {
  let state = { v: 0 }
  const h = new History({
    limit,
    getCurrent: () => state,
    setCurrent: (v) => {
      state = v
    },
  })
  return {
    h,
    get: () => state.v,
    commit: (v) => h.commit({ v }),
  }
}

test('初始状态:canUndo/canRedo 都是 false', () => {
  const { h } = makeHistory()
  assert.equal(h.canUndo, false)
  assert.equal(h.canRedo, false)
})

test('commit 一次后 canUndo=true,canRedo=false', () => {
  const { h, commit } = makeHistory()
  commit(1)
  assert.equal(h.canUndo, true)
  assert.equal(h.canRedo, false)
})

test('undo 把状态回滚到 commit 之前的快照', () => {
  const { h, get, commit } = makeHistory()
  commit(1)
  commit(2)
  assert.equal(get(), 2)
  h.undo()
  assert.equal(get(), 1)
  h.undo()
  assert.equal(get(), 0)
  assert.equal(h.canUndo, false)
  assert.equal(h.canRedo, true)
})

test('redo 重做,future 栈清空时停下', () => {
  const { h, get, commit } = makeHistory()
  commit(1)
  commit(2)
  h.undo()
  h.undo()
  assert.equal(get(), 0)
  h.redo()
  assert.equal(get(), 1)
  h.redo()
  assert.equal(get(), 2)
  assert.equal(h.canRedo, false)
})

test('undo 之后再 commit 会清空 future(典型撤销树分支)', () => {
  const { h, get, commit } = makeHistory()
  commit(1)
  commit(2)
  h.undo() // 回到 1
  assert.equal(h.canRedo, true)
  commit(3) // 走新分支
  assert.equal(h.canRedo, false, '新 commit 应清空 future')
  assert.equal(get(), 3)
})

test('容量限制:超出 limit 从最旧丢弃', () => {
  const { h, get, commit } = makeHistory(3)
  commit(1)
  commit(2)
  commit(3)
  commit(4)
  commit(5)
  // past 容量 3,只保留 2/3/4,最旧的 1 已被丢弃
  assert.equal(h.pastSize, 3)
  h.undo() // 4
  assert.equal(get(), 4)
  h.undo() // 3
  assert.equal(get(), 3)
  h.undo() // 2
  assert.equal(get(), 2)
  // 再 undo 应无效(canUndo=false,state 不变)
  const before = get()
  h.undo()
  assert.equal(get(), before)
})

test('未 commit 时 undo 无效', () => {
  const { h, get } = makeHistory()
  h.undo()
  assert.equal(get(), 0)
})

test('reset 清空 past + future', () => {
  const { h, commit } = makeHistory()
  commit(1)
  commit(2)
  h.undo()
  h.reset()
  assert.equal(h.canUndo, false)
  assert.equal(h.canRedo, false)
})
