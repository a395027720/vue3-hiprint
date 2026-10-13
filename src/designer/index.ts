/**
 * src/designer 模块入口。
 *
 * 使用:
 *   import { PrintDesigner, useDesigner, printTemplate } from '@jake-gao/vue3-hiprint/designer'
 */

// 公共 API
export { useDesigner } from './api/useDesigner'
export type { UseDesignerOptions, UseDesignerReturn } from './api/useDesigner'

export { printTemplate } from './utils/print'

// Core types(用户经常需要 import 来写 patch)
export type {
  Template,
  Paper,
  Element,
  ElementType,
  TextElement,
  ImageElement,
  TableElement,
  TableColumn,
  LineElement,
  PageBreakMode,
  Align,
  FontWeight,
  ImageFit,
  ElementPatch,
} from './core/types'

// Core helpers(用户可能想自己用 immutable helper)
export {
  createText,
  createImage,
  createTable,
  createLine,
  createElement,
  createTemplate,
  updateElement,
  addElement,
  removeElement,
  setPaper,
  findElement,
} from './core/schema'

export { renderTemplate, renderElement, mmToPx, resolveDataPath, paginate } from './core/render'
export { alignHorizontal, alignVertical } from './core/align'
export type { HorizontalAlign, VerticalAlign } from './core/align'

// 组件
import PrintDesigner from './components/PrintDesigner.vue'
export { PrintDesigner }
export { default as ElementPalette } from './components/ElementPalette.vue'
export { default as DesignerCanvas } from './components/DesignerCanvas.vue'
export { default as PropertyPanel } from './components/PropertyPanel.vue'
export { default as ElementRenderer } from './components/ElementRenderer.vue'
