/**
 * table 元素属性 schema。
 * 基础 = dataPath/字号;高级 = 分页策略;columns = 列编辑(PropertyPanel 单独处理)。
 */

import type { SectionDef } from '../core/fieldSchema'

export const TABLE_SECTIONS: SectionDef[] = [
  {
    title: '数据',
    category: 'base',
    fields: [
      { key: 'dataPath', label: '数据路径', kind: 'text' },
      { key: 'fontSize', label: '字号 (pt)', kind: 'number', min: 6, max: 96 },
    ],
  },
  {
    title: '分页',
    category: 'advanced',
    fields: [
      { key: 'pageBreakBefore', label: '另起一页(强制)', kind: 'checkbox' },
      { key: 'rowBreak', label: '行内不跨页', kind: 'checkbox' },
      { key: 'repeatHeader', label: '跨页重复表头', kind: 'checkbox' },
    ],
  },
]
