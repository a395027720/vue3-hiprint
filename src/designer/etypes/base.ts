/**
 * 公共属性段:位置 / 尺寸 / 边框 / 内边距。所有 element 都可用。
 * fieldSchema.ts 在 getSections(el) 里把 base + per-type 合并返回。
 */

import type { FieldOption, SectionDef } from '../core/fieldSchema'

/** 基础:位置 / 尺寸,所有 element 都有 */
export const POSITION_SECTION: SectionDef = {
  title: '位置 / 尺寸 (mm)',
  category: 'base',
  columns: 2,
  fields: [
    { key: 'x', label: 'X', kind: 'number', step: 0.5, precision: 2 },
    { key: 'y', label: 'Y', kind: 'number', step: 0.5, precision: 2 },
    { key: 'w', label: 'W', kind: 'number', min: 1, step: 0.5, precision: 2 },
    { key: 'h', label: 'H', kind: 'number', min: 0, step: 0.5, precision: 2 },
  ],
}

/** 边框:学 hiprint,4 边独立 select[否/实线/虚线],固定 1pt 黑色 */
export const BORDER_STYLE_OPTIONS: FieldOption[] = [
  { value: '', label: '否' },
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
]

/** 内边距固定值(mm,1 档默认 + 27 档,0.25 起步 0.5 步进到 10mm) */
const PADDING_VALUES: number[] = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
  12, 14, 16, 18, 20,
]
export const PADDING_OPTIONS: FieldOption[] = [
  { value: '', label: '默认' },
  ...PADDING_VALUES.map((v) => ({ value: String(v), label: `${v}mm` })),
]

export const BORDER_SECTION: SectionDef = {
  title: '边框',
  category: 'border',
  columns: 2,
  fields: [
    { key: 'borderTop', label: '上边框', kind: 'select', options: BORDER_STYLE_OPTIONS },
    { key: 'borderRight', label: '右边框', kind: 'select', options: BORDER_STYLE_OPTIONS },
    { key: 'borderBottom', label: '下边框', kind: 'select', options: BORDER_STYLE_OPTIONS },
    { key: 'borderLeft', label: '左边框', kind: 'select', options: BORDER_STYLE_OPTIONS },
    { key: 'borderSize', label: '边框大小 (mm)', kind: 'number', min: 0, step: 0.1 },
    { key: 'borderColor', label: '边框颜色', kind: 'color' },
    { key: 'borderRadius', label: '圆角 (mm)', kind: 'number', min: 0, step: 0.5 },
    { key: 'paddingTop', label: '上内边距', kind: 'select', options: PADDING_OPTIONS },
    { key: 'paddingRight', label: '右内边距', kind: 'select', options: PADDING_OPTIONS },
    { key: 'paddingBottom', label: '下内边距', kind: 'select', options: PADDING_OPTIONS },
    { key: 'paddingLeft', label: '左内边距', kind: 'select', options: PADDING_OPTIONS },
  ],
}

/** Rect / Circle 形状的 fill 段(可选) */
export const FILL_SECTION: SectionDef = {
  title: '填充',
  category: 'style',
  fields: [
    { key: 'fill', label: '填充色', kind: 'color' },
  ],
}
