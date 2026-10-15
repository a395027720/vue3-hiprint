/**
 * rect(矩形) 元素属性 schema。
 * 描边由 base.BORDER_SECTION 统一控制,这里只补 fill。
 */

import { FILL_SECTION } from './base'
import type { SectionDef } from '../core/fieldSchema'

export const RECT_SECTIONS: SectionDef[] = [FILL_SECTION]
