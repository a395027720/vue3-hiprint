/**
 * line 元素属性 schema。
 * line 整体就是一个视觉元素,不分基础/样式,粗细 + 颜色。
 */

import type { SectionDef } from '../core/fieldSchema'

export const LINE_SECTIONS: SectionDef[] = [
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
