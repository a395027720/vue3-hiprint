/**
 * 字段 schema 描述符 — PropertyPanel 的"声明式驱动"层。
 *
 * 新增一个 element type 时,只需在 TYPE_SECTIONS 里加一个 entry;
 * PropertyPanel.vue 不需要任何修改。
 *
 * 一个 FieldDef 描述一个 UI 控件:
 *   - key: 对应 Element 对象的字段名
 *   - kind: 控件类型(决定渲染哪种 input)
 *   - options: 仅 select 用
 *   - showWhen: 仅在特定条件下显示
 *
 * 一个 SectionDef 描述一个分组(对应右侧面板的折叠面板),带 category:
 *   - 'base':     基础,默认展开(位置尺寸、内容、src、dataPath)
 *   - 'style':    样式,默认展开(颜色、字号、字体、边框)
 *   - 'advanced': 高级,默认折叠(分页策略等)
 *   - 'columns':  表格列编辑,table 专属,默认折叠
 *
 * PropertyPanel 把 sections 按 category 分到 4 个折叠面板里渲染。
 */

import type { Element, ElementType } from './types'

// ========== 控件类型 ==========

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'checkbox'
  | 'select'

export type Category = 'base' | 'style' | 'border' | 'advanced' | 'columns'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: FieldOption[]
  min?: number
  max?: number
  step?: number
  showWhen?: (el: Element) => boolean
}

export interface SectionDef {
  title: string
  category: Category
  fields: FieldDef[]
  /** 每行几列,默认 1(单列纵向),position 段用 2(2x2 网格) */
  columns?: 1 | 2
}

// ========== 通用段 ==========

/** 基础:位置 / 尺寸,所有 element 都有 */
const POSITION_SECTION: SectionDef = {
  title: '位置 / 尺寸 (mm)',
  category: 'base',
  columns: 2,
  fields: [
    { key: 'x', label: 'X', kind: 'number', step: 0.5 },
    { key: 'y', label: 'Y', kind: 'number', step: 0.5 },
    { key: 'w', label: 'W', kind: 'number', min: 1, step: 0.5 },
    { key: 'h', label: 'H', kind: 'number', min: 0, step: 0.5 },
  ],
}

/** 边框:学 hiprint,4 边独立 select[否/实线/虚线],固定 1pt 黑色 */
const BORDER_STYLE_OPTIONS: FieldOption[] = [
  { value: '', label: '否' },
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
]

/** 内边距固定值(mm,1 档默认 + 27 档,0.25 起步 0.5 步进到 10mm) */
const PADDING_VALUES: number[] = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
  12, 14, 16, 18, 20,
]
const PADDING_OPTIONS: FieldOption[] = [
  { value: '', label: '默认' },
  ...PADDING_VALUES.map((v) => ({ value: String(v), label: `${v}mm` })),
]

const BORDER_SECTION: SectionDef = {
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

// ========== 各 type 专属段 ==========

/** text:基础 = 内容;样式 = 字号/字体/颜色/对齐/换行/装饰/背景/层级;无高级 */
const TEXT_SECTIONS: SectionDef[] = [
  {
    title: '内容',
    category: 'base',
    fields: [
      { key: 'text', label: '文本', kind: 'textarea' },
    ],
  },
  {
    title: '字体',
    category: 'style',
    columns: 2,
    fields: [
      { key: 'fontSize', label: '字号 (pt)', kind: 'number', min: 6, max: 96 },
      { key: 'fontFamily', label: '字体', kind: 'text' },
      { key: 'lineHeight', label: '行高', kind: 'number', min: 0.5, step: 0.1 },
      { key: 'letterSpacing', label: '字距 (px)', kind: 'number', step: 0.5 },
      {
        key: 'fontWeight',
        label: '粗细',
        kind: 'select',
        options: [
          { value: 'normal', label: '正常' },
          { value: 'bold', label: '粗体' },
          { value: '100', label: '100(细)' },
          { value: '300', label: '300' },
          { value: '500', label: '500' },
          { value: '700', label: '700' },
          { value: '900', label: '900(粗)' },
        ],
      },
      {
        key: 'align',
        label: '左右对齐',
        kind: 'select',
        options: [
          { value: 'left', label: '左' },
          { value: 'center', label: '中' },
          { value: 'right', label: '右' },
        ],
      },
      {
        key: 'verticalAlign',
        label: '上下对齐',
        kind: 'select',
        options: [
          { value: 'top', label: '上' },
          { value: 'middle', label: '中' },
          { value: 'bottom', label: '下' },
        ],
      },
      {
        key: 'textWrap',
        label: '文本换行',
        kind: 'select',
        options: [
          { value: 'normal', label: '自动换行' },
          { value: 'nowrap', label: '不换行' },
          { value: 'break-word', label: '强制换行' },
          { value: 'ellipsis', label: '省略号截断' },
        ],
      },
      {
        key: 'textDecoration',
        label: '文本修饰',
        kind: 'select',
        options: [
          { value: 'none', label: '无' },
          { value: 'underline', label: '下划线' },
          { value: 'overline', label: '上划线' },
          { value: 'line-through', label: '穿梭线' },
        ],
      },
      { key: 'color', label: '颜色', kind: 'color' },
      { key: 'backgroundColor', label: '背景', kind: 'color' },
      { key: 'rotate', label: '旋转 (度)', kind: 'number', step: 1 },
      { key: 'zIndex', label: '层级', kind: 'number', step: 1 },
    ],
  },
]

/** image:基础 = src;样式 = fit(填充) */
const IMAGE_SECTIONS: SectionDef[] = [
  {
    title: '图片',
    category: 'base',
    fields: [
      { key: 'src', label: 'URL', kind: 'text' },
    ],
  },
  {
    title: '显示',
    category: 'style',
    fields: [
      {
        key: 'fit',
        label: '填充',
        kind: 'select',
        options: [
          { value: 'contain', label: 'contain(等比)' },
          { value: 'cover', label: 'cover(裁剪)' },
          { value: 'fill', label: 'fill(拉伸)' },
        ],
      },
    ],
  },
]

/** table:基础 = dataPath/字号;高级 = 分页策略;columns = 列编辑(在 PropertyPanel 单独处理) */
const TABLE_SECTIONS: SectionDef[] = [
  {
    title: '数据',
    category: 'base',
    fields: [
      { key: 'dataPath', label: '数据路径', kind: 'text' },
      { key: 'fontSize', label: '字号 (pt)', kind: 'number', min: 6, max: 96 },
    ],
  },
  {
    title: '分页',
    category: 'advanced',
    fields: [
      { key: 'pageBreakBefore', label: '另起一页(强制)', kind: 'checkbox' },
      { key: 'rowBreak', label: '行内不跨页', kind: 'checkbox' },
      { key: 'repeatHeader', label: '跨页重复表头', kind: 'checkbox' },
    ],
  },
]

/** line:基础 = 粗细/颜色(line 整体就是一个视觉元素,不分基础/样式) */
const LINE_SECTIONS: SectionDef[] = [
  {
    title: '线条',
    category: 'base',
    columns: 2,
    fields: [
      { key: 'thickness', label: '粗细 (pt)', kind: 'number', min: 0.1, step: 0.5 },
      { key: 'color', label: '颜色', kind: 'color' },
    ],
  },
]

// ========== 总入口 ==========

const TYPE_SECTIONS: Record<ElementType, SectionDef[]> = {
  text: TEXT_SECTIONS,
  image: IMAGE_SECTIONS,
  table: TABLE_SECTIONS,
  line: LINE_SECTIONS,
}

/**
 * 返回当前选中元素应该渲染的所有 section(通用 + 类型专属)。
 * table 不加通用 border(用自己 borderColor),其它 type 加。
 */
export function getSections(el: Element): SectionDef[] {
  const specific = TYPE_SECTIONS[el.type] ?? []
  if (el.type === 'table') return [POSITION_SECTION, ...specific]
  return [POSITION_SECTION, BORDER_SECTION, ...specific]
}

/**
 * 把 sections 按 category 分组,用于 PropertyPanel 的折叠面板渲染。
 */
export function groupByCategory(sections: SectionDef[]): Record<Category, SectionDef[]> {
  const groups: Record<Category, SectionDef[]> = {
    base: [],
    style: [],
    border: [],
    advanced: [],
    columns: [],
  }
  for (const s of sections) {
    groups[s.category].push(s)
  }
  return groups
}

/** 默认展开的 category(基础 + 样式) */
export const DEFAULT_OPEN_CATEGORIES: Category[] = ['base', 'style']

/**
 * 把 field 控件的值翻译成 patch 的目标值。
 * 例如 'fontWeight' checkbox → 'bold' | 'normal'
 *                  'rowBreak' checkbox → 'row' | 'auto'
 */
export function normalizePatchValue(
  field: FieldDef,
  el: Element,
  rawValue: unknown,
): unknown {
  if (field.kind === 'checkbox') {
    if (field.key === 'rowBreak') {
      return rawValue ? 'row' : 'auto'
    }
    if (field.key === 'fontWeight') {
      return rawValue ? 'bold' : 'normal'
    }
    return rawValue
  }
  return rawValue
}
