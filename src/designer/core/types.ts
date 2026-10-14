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
  /** 锁定:true 时画布不允许拖动/resize/旋转(右键菜单可解锁) */
  locked?: boolean
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
  fontStyle?: 'normal' | 'italic'
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
  /** 列表模式:none / ul / ol,为列表时 text 按 \n 拆成 <li> 渲染 */
  listType?: 'none' | 'ul' | 'ol'
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

// ========== PageNum(页码) ==========

export interface PageNumElement extends BaseElement {
  type: 'pagenum'
  /** 显示模板,支持 {page} / {total} 占位符 */
  format: string
  fontSize: number
  fontWeight?: FontWeight
  color?: string
  fontFamily?: string
  align?: Align
  verticalAlign?: VerticalAlign
}

// ========== Barcode(条形码) ==========

export interface BarcodeElement extends BaseElement {
  type: 'barcode'
  /** 条形码内容 */
  value: string
  /** 条码类型,如 'code128' / 'ean13' / 'qrcode'(由 bwip-js 支持) */
  symbology: string
}

// ========== Qrcode(二维码) ==========

export interface QrcodeElement extends BaseElement {
  type: 'qrcode'
  /** 二维码内容 */
  value: string
  /** 容错级别 L/M/H */
  errorLevel?: 'L' | 'M' | 'H'
}

// ========== MultiLabel(多标签,一格多标签) ==========

export interface MultiLabelElement extends BaseElement {
  type: 'multilabel'
  /** 标签块数组 */
  labels: Array<{ text: string; color?: string }>
  /** 每行列数 */
  cols: number
  fontSize: number
  color?: string
}

// ========== Rect(矩形) ==========

export interface RectElement extends BaseElement {
  type: 'rect'
  fill?: string
  /** 描边由 border* 字段控制(共享 BaseElement 4 边) */
}

// ========== Circle(圆形) ==========

export interface CircleElement extends BaseElement {
  type: 'circle'
  fill?: string
}

// ========== Element 联合 ==========

export type Element =
  | TextElement
  | ImageElement
  | TableElement
  | LineElement
  | PageNumElement
  | BarcodeElement
  | QrcodeElement
  | MultiLabelElement
  | RectElement
  | CircleElement
export type ElementType = Element['type']

export type ElementOfType<T extends ElementType> = Extract<Element, { type: T }>

/** 兼容旧字段名的别名(后续可能删) */
export type PageBreakMode = RowBreakMode

// ========== Page / Template ==========

/**
 * 模板页。每页独立坐标系(0~paper.w / 0~paper.h),多页时 page 间错开排版。
 * `repeatPerPage` 标记的元素会在所有 page 重复渲染(全局继承,如页眉/页码)。
 */
export interface Page {
  id: string
  elements: Element[]
  repeatPerPage?: boolean
}

export interface Template {
  version: '1.0'
  paper: Paper
  pages: Page[]
}

// ========== 工具类型 ==========

/** 任意 element 的部分更新(用于 updateElement helper) */
export type ElementPatch<T extends Element = Element> = Partial<Omit<T, 'id' | 'type'>>

/** 默认字体 */
export const DEFAULT_FONT_SIZE = 12
