/**
 * multilabel(多标签) 元素属性 schema。
 * 基础 = cols(每行列数);样式 = 字号/颜色。
 * 标签块数组 labels 走专用 UI(不在 schema 通用字段里)。
 */

import type { SectionDef } from '../core/fieldSchema'

export const MULTILABEL_SECTIONS: SectionDef[] = [
  {
    title: '布局',
    category: 'base',
    fields: [
      { key: 'cols', label: '每行列数', kind: 'number', min: 1, step: 1 },
    ],
  },
  {
    title: '字体',
    category: 'style',
    columns: 2,
    fields: [
      { key: 'fontSize', label: '字号 (mm)', kind: 'number', min: 2, max: 30, step: 0.1, precision: 1 },
      { key: 'color', label: '默认颜色', kind: 'color' },
    ],
  },
]
