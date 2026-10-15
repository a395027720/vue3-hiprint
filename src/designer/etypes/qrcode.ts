/**
 * qrcode(二维码) 元素属性 schema。
 * 基础 = value / errorLevel(容错级别 L/M/H)。
 */

import type { SectionDef } from '../core/fieldSchema'

export const QRCODE_SECTIONS: SectionDef[] = [
  {
    title: '二维码',
    category: 'base',
    fields: [
      { key: 'value', label: '内容', kind: 'textarea' },
      {
        key: 'errorLevel',
        label: '容错级别',
        kind: 'select',
        options: [
          { value: 'L', label: 'L (低, 7%)' },
          { value: 'M', label: 'M (中, 15%)' },
          { value: 'H', label: 'H (高, 30%)' },
        ],
      },
    ],
  },
]
