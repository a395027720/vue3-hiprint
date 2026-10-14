/**
 * 元素样式共享 helper。
 *
 * 被 elements/ 下的每种元素组件共用:
 * - sideCss:把 borderTop/Right/Bottom/Left + borderSize + borderColor 拼成 CSS border-* 字符串
 * - paddingSide:padding 字段转 CSS padding-* 字符串
 */

export type BorderSides = {
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  borderSize?: number
  borderColor?: string
}

export type PaddingSides = {
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
}

export type Side = 'top' | 'right' | 'bottom' | 'left'

export function sideCss(e: BorderSides, side: Side): string | undefined {
  const key = `border${side[0]!.toUpperCase()}${side.slice(1)}` as keyof BorderSides
  const v = e[key] as string | undefined
  if (!v) return undefined
  return `${e.borderSize ?? 0.25}mm ${v} ${e.borderColor ?? '#000'}`
}

export function paddingSide(e: PaddingSides, side: Side): string | undefined {
  const key = `padding${side[0]!.toUpperCase()}${side.slice(1)}` as keyof PaddingSides
  const v = e[key] as number | undefined
  return v ? `${v}mm` : undefined
}

/** 把 border / padding / boxSizing 合并成内联样式对象(给几何 + 文本 + 表格 box 用) */
export function boxStyle(
  e: BorderSides & PaddingSides & { borderRadius?: number },
  extra?: { isCircle?: boolean },
): Record<string, string | number | undefined> {
  return {
    borderTop: sideCss(e, 'top'),
    borderRight: sideCss(e, 'right'),
    borderBottom: sideCss(e, 'bottom'),
    borderLeft: sideCss(e, 'left'),
    borderRadius: e.borderRadius ? `${e.borderRadius}mm` : extra?.isCircle ? '50%' : undefined,
    paddingTop: paddingSide(e, 'top'),
    paddingRight: paddingSide(e, 'right'),
    paddingBottom: paddingSide(e, 'bottom'),
    paddingLeft: paddingSide(e, 'left'),
    boxSizing: 'border-box',
  }
}