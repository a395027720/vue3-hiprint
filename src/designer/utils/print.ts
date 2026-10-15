/**
 * iframe 打印工具。
 *
 * 把 Template + data 渲染成完整 HTML,塞到一个隐藏 iframe,
 * 调 iframe.contentWindow.print() 触发系统打印对话框。
 *
 * 关键:
 * - iframe 必须 display:block(部分浏览器对 display:none 的 iframe 不会渲染)
 * - 渲染完成后才能 print(用 onload 等待)
 * - 父页面不能有滚动条(临时 fix body overflow)
 */

import type { Template } from '../core/types'
import { renderTemplate } from '../core/render'

let iframe: HTMLIFrameElement | null = null
let originalBodyOverflow: string | null = null

/**
 * 触发浏览器打印。
 * @returns Promise<true> 成功进入打印流程
 */
export function printTemplate(
  tpl: Template,
  data: unknown,
  pageMarginHorizontal = 0,
  pageMarginVertical = 0,
): Promise<boolean> {
  return new Promise((resolve) => {
    // 清理上一次的 iframe
    if (iframe) {
      iframe.remove()
      iframe = null
    }

    const el = document.createElement('iframe')
    el.setAttribute('aria-hidden', 'true')
    el.style.position = 'fixed'
    el.style.right = '0'
    el.style.bottom = '0'
    el.style.width = '0'
    el.style.height = '0'
    el.style.border = '0'
    document.body.appendChild(el)
    iframe = el

    const doc = el.contentDocument
    if (!doc) {
      el.remove()
      iframe = null
      resolve(false)
      return
    }

    // 写 HTML
    doc.open()
    doc.write(renderTemplate(tpl, data, pageMarginHorizontal, pageMarginVertical))
    doc.close()

    el.onload = () => {
      try {
        // 临时锁住父页面滚动,避免打印预览抖动
        if (originalBodyOverflow === null) {
          originalBodyOverflow = document.body.style.overflow
          document.body.style.overflow = 'hidden'
        }
        el.contentWindow?.focus()
        el.contentWindow?.print()
        resolve(true)
      } catch (e) {
        console.error('[designer] print failed:', e)
        resolve(false)
      } finally {
        // 打印对话框关闭后清理
        setTimeout(() => {
          el.remove()
          iframe = null
          if (originalBodyOverflow !== null) {
            document.body.style.overflow = originalBodyOverflow
            originalBodyOverflow = null
          }
        }, 500)
      }
    }
  })
}
