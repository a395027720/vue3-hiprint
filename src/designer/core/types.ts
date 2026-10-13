/**
 * 核心类型定义。
 *
 * 所有坐标 / 尺寸单位都是 **mm**,与打印纸张一致,避免 px / pt 转换。
 * 设计器画布按 1mm ≈ 3.78px(96 DPI)的比例显示。
 */

// ========== Paper ==========

export interface Paper {
  width: number // mm
  height: number // mm
}

// ========== Element 基础 ==========

interface BaseElement {
  id: string
  x: number // 左上角 x (mm)
  y: number // 左上角 y (mm)
  w: number // 宽 (mm)
  h: number // 高 (mm)
  /** 4 边独立边框,每个值是 CSS border-style(学 hiprint)。undefined = 无边框。 */
  borderTop?: 'solid' | 'dashed' | 'dotted'
  borderRight?: 'solid' | 'dashed' | 'dotted'
  borderBottom?: 'solid' | 'dashed' | 'dotted'
  borderLeft?: 'solid' | 'dashed' | 'dotted'
  /** 边框大小 mm(全局,4 边共用,默认 0.25mm) */
  borderSize?: number
  /** 边框颜色(全局,4 边共用,默认 #000) */
  borderColor?: string
  /** 圆角 mm(全局,4 角相同) */
  borderRadius?: number
  /** 4 个内边距 mm(默认 0) */
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  /** 旋转角度(度,顺时针) */
  rotate?: number
  /** 元素层级(数字越大越靠上) */
  zIndex?: number
}

// ========== Text ==========

export type FontWeight = 'normal' | 'bold' | '100' | '300' | '500' | '700' | '900'
export type Align = 'left' | 'center' | 'right'

/** 上下对齐(用 flex align-items 实现,CSS vertical-align 对 div 块级元素无效) */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

/** 文本换行策略 */
export type TextWrap = 'normal' | 'nowrap' | 'break-word' | 'ellipsis'

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number // pt
  fontWeight?: FontWeight
  color?: string // hex, e.g. '#000000'
  align?: Align
  /** 字体族,如 'SimSun' / 'Microsoft YaHei' / 'sans-serif' */
  fontFamily?: string
  /** 行高倍数,默认 1.2 */
  lineHeight?: number
  /** 背景色,hex */
  backgroundColor?: string
  /** 文本修饰(下划线/上划线/删除线) */
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through'
  /** 字间距 px */
  letterSpacing?: number
  /** 上下对齐(默认 top) */
  verticalAlign?: VerticalAlign
  /** 文本换行(默认 normal) */
  textWrap?: TextWrap
}

// ========== Image ==========

export type ImageFit = 'contain' | 'cover' | 'fill'

export interface ImageElement extends BaseElement {
  type: 'image'
  src: string
  fit?: ImageFit
}

// ========== Table(关键:分页是一等公民) ==========

/** table 的行内分页策略,'row' = 表格行内不允许跨页,'auto' = 允许任意分页,'none' = 不分页(同 auto) */
export type RowBreakMode = 'none' | 'row' | 'auto'

export interface TableColumn {
  field: string
  title: string
  width: number // mm
  align?: Align
}

export interface TableElement extends BaseElement {
  type: 'table'
  /** 指向打印数据的字段路径,如 'rows' / 'items',渲染时从 data[dataPath] 取数组 */
  dataPath: string
  columns: TableColumn[]
  /** 元素级分页:在 table 前强制另起一页(对应 hiprint 的 pageBreakBefore) */
  pageBreakBefore: boolean
  /** 行内分页:行内不允许跨页(tr { page-break-inside: avoid }) */
  rowBreak: RowBreakMode
  /** 跨页时是否重复表头(thead { display: table-header-group }) */
  repeatHeader: boolean
  fontSize: number // pt
  borderColor?: string
}

// ========== Line ==========

export interface LineElement extends BaseElement {
  type: 'line'
  thickness: number // pt
  color?: string
}

// ========== Element 联合 ==========

export type Element = TextElement | ImageElement | TableElement | LineElement
export type ElementType = Element['type']

export type ElementOfType<T extends ElementType> = Extract<Element, { type: T }>

/** 兼容旧字段名的别名(后续可能删) */
export type PageBreakMode = RowBreakMode

// ========== Template ==========

export interface Template {
  version: '1.0'
  paper: Paper
  elements: Element[]
}

// ========== 工具类型 ==========

/** 任意 element 的部分更新(用于 updateElement helper) */
export type ElementPatch<T extends Element = Element> = Partial<Omit<T, 'id' | 'type'>>

/** 默认字体 */
export const DEFAULT_FONT_SIZE = 12
