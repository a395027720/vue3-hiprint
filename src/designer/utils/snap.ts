/**
 * 元素拖动时的吸附(snap-to-edge)工具。
 *
 * 简单手写实现:TODO 后续可替换为 interact.js 的 snap 插件以获得更丰富的
 * 行为(动画、跨元素中心吸附等)。当前实现覆盖 90% 场景。
 */

export interface SnapResult {
  /** 吸附后的值(若未命中则等于入参) */
  value: number
  /** 命中的候选坐标,用于在画布上画对齐辅助线 */
  lineAt: number | null
}

/**
 * 在 candidates 列表里找最接近 value 的,差 < threshold 时吸附。
 * 返回吸附后的值与命中的候选(用于辅助线)。
 */
export function snapValue(
  value: number,
  candidates: number[],
  threshold: number,
): SnapResult {
  let best = value
  let bestDiff = threshold
  let lineAt: number | null = null
  for (const c of candidates) {
    const diff = Math.abs(value - c)
    if (diff < bestDiff) {
      bestDiff = diff
      best = c
      lineAt = c
    }
  }
  return { value: best, lineAt }
}
