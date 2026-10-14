/**
 * 长度单位换算。
 *
 * 内部统一用 **mm** 存储(打印纸张一致);UI 上根据当前 unit 换算显示。
 * 1mm = 96/25.4 px(96 DPI 屏幕)。
 */

export type Unit = 'mm' | 'px' | 'pt' | 'in' | 'cm'

/** 1 unit 多少 px(96 DPI 屏) */
export const UNIT_TO_PX: Record<Unit, number> = {
  mm: 96 / 25.4,
  px: 1,
  pt: 96 / 72,
  in: 96,
  cm: 96 / 2.54,
}

/** mm → 单位值 */
export function mmToUnit(mm: number, unit: Unit): number {
  return (mm * UNIT_TO_PX.mm) / UNIT_TO_PX[unit]
}

/** 单位值 → mm */
export function unitToMm(value: number, unit: Unit): number {
  return (value * UNIT_TO_PX[unit]) / UNIT_TO_PX.mm
}

/** 单位标签(显示用) */
export const UNIT_LABEL: Record<Unit, string> = {
  mm: 'mm',
  px: 'px',
  pt: 'pt',
  in: 'in',
  cm: 'cm',
}
