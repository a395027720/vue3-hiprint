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

/** 字体粗细:7 档(对应 core/types.FontWeight),所有有 fontWeight 的 element 共用 */
export const FONT_WEIGHT_OPTIONS: FieldOption[] = [
  { value: 'normal', label: '正常' },
  { value: 'bold', label: '粗体' },
  { value: '100', label: '100(细)' },
  { value: '300', label: '300' },
  { value: '500', label: '500' },
  { value: '700', label: '700' },
  { value: '900', label: '900(粗)' },
]

/** 字体族:对应 CSS font-family 字符串。底层数据按"常用/中文/西文/等宽"4 组存放,
 *  FONT_FAMILY_OPTIONS 由分组扁平化派生,供 PropertyPanel 平铺 select;
 *  TextQuickToolbar 直接消费 FONT_FAMILY_GROUPS 做 optgroup 分组。 */
export const FONT_FAMILY_GROUPS: { label: string; options: FieldOption[] }[] = [
  {
    label: '常用',
    options: [
      { value: '', label: '默认' },
      { value: 'system-ui, sans-serif', label: '系统默认' },
    ],
  },
  {
    label: '中文字体',
    options: [
      { value: 'SimSun, "宋体", serif', label: '宋体' },
      { value: 'SimHei, "黑体", sans-serif', label: '黑体' },
      { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑' },
      { value: 'KaiTi, "楷体", serif', label: '楷体' },
      { value: 'FangSong, "仿宋", serif', label: '仿宋' },
    ],
  },
  {
    label: '西文字体',
    options: [
      { value: 'Arial, sans-serif', label: 'Arial' },
      { value: '"Times New Roman", serif', label: 'Times New Roman' },
      { value: 'Georgia, serif', label: 'Georgia' },
      { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
      { value: 'Verdana, sans-serif', label: 'Verdana' },
    ],
  },
  {
    label: '等宽字体',
    options: [
      { value: '"Courier New", monospace', label: 'Courier New' },
      { value: 'Consolas, "Courier New", monospace', label: 'Consolas' },
      { value: 'Monaco, monospace', label: 'Monaco' },
    ],
  },
]

export const FONT_FAMILY_OPTIONS: FieldOption[] = FONT_FAMILY_GROUPS.flatMap(
  (g) => g.options,
)

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
