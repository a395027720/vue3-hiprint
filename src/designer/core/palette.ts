/**
 * 元素调色板数据。
 *
 * 顶栏 + 左侧 ElementsPanel 共用同一份数据(S4 抽离出来,避免重复)。
 * 新增元素时:加 factory + 改这里 + 改 elementGroups(顶栏仍保留元素组,直到 S5 重做顶栏)。
 */

import type { ElementType } from './types'

export interface PaletteItem {
  type: ElementType
  label: string
  icon: string
  /** 分组:通用 / 数据 / 形状 */
  group: 'general' | 'dataCodes' | 'shapes'
}

const stroke = 'currentColor'
const sw = 1.6

export const PALETTE_ITEMS: PaletteItem[] = [
  // ===== general =====
  {
    type: 'text',
    label: '文本',
    group: 'general',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 20V7H2V4h13v3h-5v13zm9 0v-8h-3V9h9v3h-3v8z"/></svg>`,
  },
  {
    type: 'image',
    label: '图片',
    group: 'general',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z"/></svg>`,
  },
  {
    type: 'pagenum',
    label: '页码',
    group: 'general',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="m6 20l1-4H3l.5-2h4l1-4h-4L5 8h4l1-4h2l-1 4h4l1-4h2l-1 4h4l-.5 2h-4l-1 4h4l-.5 2h-4l-1 4h-2l1-4H9l-1 4zm3.5-6h4l1-4h-4z"/></svg>`,
  },
  // ===== dataCodes =====
  {
    type: 'table',
    label: '表格',
    group: 'dataCodes',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 8V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v3zm2 13q-.825 0-1.412-.587T3 19v-9h4.5v11zm11.5 0V10H21v9q0 .825-.587 1.413T19 21zm-7 0V10h5v11z"/></svg>`,
  },
  {
    type: 'barcode',
    label: '条形码',
    group: 'dataCodes',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M1 19V5h2v14zm3 0V5h2v14zm3 0V5h1v14zm3 0V5h2v14zm3 0V5h3v14zm4 0V5h1v14zm3 0V5h3v14z"/></svg>`,
  },
  {
    type: 'qrcode',
    label: '二维码',
    group: 'dataCodes',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 11V3h8v8zm2-2h4V5H5zM3 21v-8h8v8zm2-2h4v-4H5zm8-8V3h8v8zm2-2h4V5h-4zm4 12v-2h2v2zm-6-6v-2h2v2zm2 2v-2h2v2zm-2 2v-2h2v2zm2 2v-2h2v2zm2-2v-2h2v2zm0-4v-2h2v2zm2 2v-2h2v2z"/></svg>`,
  },
  {
    type: 'multilabel',
    label: '多标签',
    group: 'dataCodes',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 11V3h8v8zm0 10v-8h8v8zm10-10V3h8v8zm0 10v-8h8v8z"/></svg>`,
  },
  // ===== shapes =====
  {
    type: 'line',
    label: '直线',
    group: 'shapes',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 13v-2h16v2z"/></svg>`,
  },
  {
    type: 'rect',
    label: '矩形',
    group: 'shapes',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5z"/></svg>`,
  },
  {
    type: 'circle',
    label: '圆形',
    group: 'shapes',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20"/></svg>`,
  },
]

/** 按 group 分桶 */
export function groupByPalette(
  items: PaletteItem[],
): { general: PaletteItem[]; dataCodes: PaletteItem[]; shapes: PaletteItem[] } {
  const result = { general: [], dataCodes: [], shapes: [] } as {
    general: PaletteItem[]
    dataCodes: PaletteItem[]
    shapes: PaletteItem[]
  }
  for (const it of items) result[it.group].push(it)
  return result
}

/** localStorage 键:用户自定义元素列表(S5 之前不开放) */
export const CUSTOM_ITEMS_KEY = 'vue3-hiprint:custom-elements'

/** 自定义元素(S5 才真正接入) */
export interface CustomPaletteItem extends PaletteItem {
  /** 自定义元素 JSON schema(后续 S5+) */
  schema: unknown
}
