/**
 * 通用撤销/重做栈。
 *
 * 纯类,不依赖 Vue/React/DOM,可独立单测。
 *
 * 概念:
 * - past:已撤销的状态栈(下一步 undo 从这里 pop)
 * - future:已重做的状态栈(下一步 redo 从这里 pop)
 * - commit:把当前状态推入 past、清空 future(单次事务结束)
 *
 * MVP 限制:
 * - 浅 snapshot 由调用方提供(通常 spread 一层 + elements.map(e => ({...e})))
 * - 容量 HIST_LIMIT 限制,超出从最旧丢弃
 */

export interface HistoryOpts<T> {
  /** 容量上限,默认 50 */
  limit?: number
  /** 取当前状态 */
  getCurrent: () => T
  /** 把状态写入"主存储"(通常 = 模板 ref) */
  setCurrent: (v: T) => void
}

export const HIST_LIMIT = 50

export class History<T> {
  private past: T[] = []
  private future: T[] = []
  private readonly limit: number
  private readonly getCurrent: () => T
  private readonly setCurrent: (v: T) => void

  constructor(opts: HistoryOpts<T>) {
    this.limit = opts.limit ?? HIST_LIMIT
    this.getCurrent = opts.getCurrent
    this.setCurrent = opts.setCurrent
  }

  /** 是否可撤销 */
  get canUndo(): boolean {
    return this.past.length > 0
  }

  /** 是否可重做 */
  get canRedo(): boolean {
    return this.future.length > 0
  }

  /** past 栈长度(用于响应式订阅) */
  get pastSize(): number {
    return this.past.length
  }

  /** future 栈长度(用于响应式订阅) */
  get futureSize(): number {
    return this.future.length
  }

  /**
   * 提交新状态。
   *
   * 语义:把 getCurrent() 返回的"当前 state"推入 past,然后 setCurrent(newSnapshot)
   * 把 state 推进到 newSnapshot。下次 undo 即可回到 currentSnapshot。
   *
   * 调用方只要传"想达到的新状态",History 自动:
   *   1. 快照当前 state → 入 past
   *   2. setCurrent(newSnapshot)
   */
  commit(newSnapshot: T): void {
    const current = this.getCurrent()
    const next = [...this.past, current]
    if (next.length > this.limit) next.shift()
    this.past = next
    this.future = []
    this.setCurrent(newSnapshot)
  }

  /** 撤销:从 past 拿一个写回,当前状态入 future */
  undo(): void {
    if (!this.canUndo) return
    const prev = this.past[this.past.length - 1]
    this.past = this.past.slice(0, -1)
    this.future = [...this.future, this.getCurrent()]
    this.setCurrent(prev)
  }

  /** 重做:从 future 拿一个写回,当前状态入 past */
  redo(): void {
    if (!this.canRedo) return
    const next = this.future[this.future.length - 1]
    this.future = this.future.slice(0, -1)
    this.past = [...this.past, this.getCurrent()]
    this.setCurrent(next)
  }

  /** 清空(用于 load 整模板重置时) */
  reset(): void {
    this.past = []
    this.future = []
  }
}
