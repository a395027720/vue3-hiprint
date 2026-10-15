/**
 * pagenum(页码) 元素属性 schema。
 * 基础 = format(支持 {page} / {total} 占位符);样式 = 字号/字体/颜色/对齐。
 */

import { FONT_WEIGHT_OPTIONS } from './base'
import type { SectionDef } from '../core/fieldSchema'

export const PAGENUM_SECTIONS: SectionDef[] = [
  {
    title: '内容',
    category: 'base',
    fields: [
      { key: 'format', label: '显示模板', kind: 'text' },
    ],
  },
  {
    title: '字体',
    category: 'style',
    columns: 2,
    fields: [
      { key: 'fontSize', label: '字号 (px)', kind: 'number', min: 8, max: 113, step: 1 },
      { key: 'fontFamily', label: '字体', kind: 'text' },
      {
        key: 'fontWeight',
        label: '粗细',
        kind: 'select',
        options: FONT_WEIGHT_OPTIONS,
      },
      { key: 'color', label: '颜色', kind: 'color' },
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
    ],
  },
]
