/**
 * image 元素属性 schema。
 * 基础 = src;样式 = fit(填充模式)。
 */

import type { SectionDef } from '../core/fieldSchema'

export const IMAGE_SECTIONS: SectionDef[] = [
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
