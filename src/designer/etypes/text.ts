/**
 * text 元素属性 schema。
 * 基础 = 内容;样式 = 字号/字体/颜色/对齐/换行/装饰/背景/层级;无高级。
 */

import type { SectionDef } from '../core/fieldSchema'

export const TEXT_SECTIONS: SectionDef[] = [
  {
    title: '内容',
    category: 'base',
    fields: [
      { key: 'text', label: '文本', kind: 'textarea' },
    ],
  },
  {
    title: '字体',
    category: 'style',
    columns: 2,
    fields: [
      { key: 'fontSize', label: '字号 (pt)', kind: 'number', min: 6, max: 96 },
      { key: 'fontFamily', label: '字体', kind: 'text' },
      { key: 'lineHeight', label: '行高', kind: 'number', min: 0.5, step: 0.1 },
      { key: 'letterSpacing', label: '字距 (px)', kind: 'number', step: 0.5 },
      {
        key: 'fontWeight',
        label: '粗细',
        kind: 'select',
        options: [
          { value: 'normal', label: '正常' },
          { value: 'bold', label: '粗体' },
          { value: '100', label: '100(细)' },
          { value: '300', label: '300' },
          { value: '500', label: '500' },
          { value: '700', label: '700' },
          { value: '900', label: '900(粗)' },
        ],
      },
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
      {
        key: 'textWrap',
        label: '文本换行',
        kind: 'select',
        options: [
          { value: 'normal', label: '自动换行' },
          { value: 'nowrap', label: '不换行' },
          { value: 'break-word', label: '强制换行' },
          { value: 'ellipsis', label: '省略号截断' },
        ],
      },
      {
        key: 'textDecoration',
        label: '文本修饰',
        kind: 'select',
        options: [
          { value: 'none', label: '无' },
          { value: 'underline', label: '下划线' },
          { value: 'overline', label: '上划线' },
          { value: 'line-through', label: '穿梭线' },
        ],
      },
      { key: 'color', label: '颜色', kind: 'color' },
      { key: 'backgroundColor', label: '背景', kind: 'color' },
      { key: 'rotate', label: '旋转 (度)', kind: 'number', step: 1 },
      { key: 'zIndex', label: '层级', kind: 'number', step: 1 },
    ],
  },
]
