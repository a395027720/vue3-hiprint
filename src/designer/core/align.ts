/**
 * 元素对齐工具。
 *
 * 按方向拆成两个独立 API,语义更清楚:
 * - 水平对齐(沿 X 轴):left / center / right
 * - 垂直对齐(沿 Y 轴):top / middle / bottom
 *
 * 返回新 Template(不修改原对象)。
 * 多页支持:对齐操作只在元素所在 page 内进行。
 */

import type { Template } from './types'
import { findElementGlobal, updateElement } from './schema'

/** 水平对齐:相对画布,沿 X 轴 */
export type HorizontalAlign = 'left' | 'center' | 'right'

/** 垂直对齐:相对画布,沿 Y 轴 */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

function withXY(
  tpl: Template,
  id: string,
  x: number,
  y: number,
): Template {
  const found = findElementGlobal(tpl, id)
  if (!found) return tpl
  return updateElement(tpl, found.pageIndex, id, { x, y })
}

/** 水平对齐单个元素。 */
export function alignHorizontal(
  tpl: Template,
  id: string,
  mode: HorizontalAlign,
): Template {
  const found = findElementGlobal(tpl, id)
  if (!found) return tpl
  const el = found.el
  const { width: paperW } = tpl.paper
  let x = el.x
  switch (mode) {
    case 'left': x = 0; break
    case 'center': x = (paperW - el.w) / 2; break
    case 'right': x = paperW - el.w; break
  }
  return withXY(tpl, id, x, el.y)
}

/** 垂直对齐单个元素。 */
export function alignVertical(
  tpl: Template,
  id: string,
  mode: VerticalAlign,
): Template {
  const found = findElementGlobal(tpl, id)
  if (!found) return tpl
  const el = found.el
  const { height: paperH } = tpl.paper
  let y = el.y
  switch (mode) {
    case 'top': y = 0; break
    case 'middle': y = (paperH - el.h) / 2; break
    case 'bottom': y = paperH - el.h; break
  }
  return withXY(tpl, id, el.x, y)
}
