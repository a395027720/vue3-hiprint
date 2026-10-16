/**
 * 字段 schema 描述符 — PropertyPanel 的"声明式驱动"层。
 *
 * 数据源:base 段在 ./etypes/base.ts(位置/尺寸/边框/填充/内边距),
 * per-type 段在 ./etypes/<type>.ts(text/image/table/line/...)。
 *
 * 新增一个 element type 时,只需在 ./etypes/ 下加一个文件 + 在
 * TYPE_SECTIONS 里加一行 import 和 entry;PropertyPanel.vue 不用改。
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
import { BORDER_SECTION, POSITION_SECTION } from '../etypes/base'
import { TEXT_SECTIONS } from '../etypes/text'
import { IMAGE_SECTIONS } from '../etypes/image'
import { TABLE_SECTIONS } from '../etypes/table'
import { LINE_SECTIONS } from '../etypes/line'
import { PAGENUM_SECTIONS } from '../etypes/pagenum'
import { BARCODE_SECTIONS } from '../etypes/barcode'
import { QRCODE_SECTIONS } from '../etypes/qrcode'
import { MULTILABEL_SECTIONS } from '../etypes/multilabel'
import { RECT_SECTIONS } from '../etypes/rect'
import { CIRCLE_SECTIONS } from '../etypes/circle'

// ========== 控件类型 ==========

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'checkbox'
  | 'switch'
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
  /** number 类型显示时保留的小数位数(不传 = 原样显示) */
  precision?: number
  showWhen?: (el: Element) => boolean
}

export interface SectionDef {
  title: string
  category: Category
  fields: FieldDef[]
  /** 每行几列,默认 1(单列纵向),position 段用 2(2x2 网格) */
  columns?: 1 | 2
  /** 排序权重,升序排列(数字小在前);缺省 0。
   *  公共 POSITION/BORDER 不设;per-type section 想插到前面就传负数 */
  priority?: number
}

// ========== 类型专属段(由 per-type 文件导出) ==========

const TYPE_SECTIONS: Record<ElementType, SectionDef[]> = {
  text: TEXT_SECTIONS,
  image: IMAGE_SECTIONS,
  table: TABLE_SECTIONS,
  line: LINE_SECTIONS,
  pagenum: PAGENUM_SECTIONS,
  barcode: BARCODE_SECTIONS,
  qrcode: QRCODE_SECTIONS,
  multilabel: MULTILABEL_SECTIONS,
  rect: RECT_SECTIONS,
  circle: CIRCLE_SECTIONS,
}

// ========== 总入口 ==========

/**
 * 返回当前选中元素应该渲染的所有 section(通用 + 类型专属)。
 * table 不加通用 border(用自己 borderColor),其它 type 加。
 */
export function getSections(el: Element): SectionDef[] {
  const specific = TYPE_SECTIONS[el.type] ?? []
  const base = el.type === 'table'
    ? [POSITION_SECTION]
    : [POSITION_SECTION, BORDER_SECTION]
  // 按 priority 升序(数字小在前),缺省 0
  return [...base, ...specific].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  )
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
  // 字号字段 UI 用 px(用户视角),内部存储 mm(画布坐标一致);
  // 1mm = 96/25.4 px,mm ≈ px * 25.4/96
  if (field.key === 'fontSize' && typeof rawValue === 'number') {
    return +(rawValue * 25.4 / 96).toFixed(2)
  }
  return rawValue
}
