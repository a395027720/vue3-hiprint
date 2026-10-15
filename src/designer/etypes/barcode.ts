/**
 * barcode(条形码) 元素属性 schema。
 * 基础 = value / symbology(bwip-js 支持的类型)。
 */

import type { SectionDef } from '../core/fieldSchema'

export const BARCODE_SECTIONS: SectionDef[] = [
  {
    title: '条形码',
    category: 'base',
    fields: [
      { key: 'value', label: '内容', kind: 'text' },
      {
        key: 'symbology',
        label: '条码类型',
        kind: 'select',
        options: [
          { value: 'code128', label: 'Code 128' },
          { value: 'code39', label: 'Code 39' },
          { value: 'ean13', label: 'EAN-13' },
          { value: 'ean8', label: 'EAN-8' },
          { value: 'upca', label: 'UPC-A' },
          { value: 'upce', label: 'UPC-E' },
          { value: 'itf14', label: 'ITF-14' },
          { value: 'codabar', label: 'Codabar' },
        ],
      },
    ],
  },
]
