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
export function printTemplate(tpl: Template, data: unknown): Promise<boolean> {
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
    doc.write(renderTemplate(tpl, data))
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

/**
 * 弹出打印预览 modal:每张 paper 按真实尺寸居中显示,
 * 底部"打印"/"关闭"按钮。返回的 promise 在 modal 关闭时 resolve。
 *
 * MVP 局限:简单套一个固定定位容器,不支持缩放、翻页、暗色背景。
 * 后续 PR 可换 PDF.js 或专门的 preview 组件。
 */
export function previewTemplate(tpl: Template, data: unknown): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'designer-preview-overlay'
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '99999',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
    } as CSSStyleDeclaration)

    const toolbar = document.createElement('div')
    Object.assign(toolbar.style, {
      flex: '0 0 auto', padding: '12px 16px',
      background: '#fff', borderBottom: '1px solid #e8e8e8',
      display: 'flex', alignItems: 'center', gap: '8px',
    } as CSSStyleDeclaration)

    const title = document.createElement('div')
    title.textContent = '打印预览'
    Object.assign(title.style, {
      fontSize: '14px', fontWeight: '600', flex: '1',
    } as CSSStyleDeclaration)

    const printBtn = document.createElement('button')
    printBtn.textContent = '打印'
    Object.assign(printBtn.style, buttonStyle('#1677ff', '#fff'))

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '关闭'
    Object.assign(closeBtn.style, buttonStyle('#fff', '#333', '#d0d0d0'))

    toolbar.append(title, printBtn, closeBtn)

    const body = document.createElement('div')
    Object.assign(body.style, {
      flex: '1', overflow: 'auto', padding: '24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    } as CSSStyleDeclaration)
    body.innerHTML = renderTemplate(tpl, data)

    overlay.append(toolbar, body)
    document.body.appendChild(overlay)

    function close() {
      overlay.remove()
      document.removeEventListener('keydown', onKey)
      resolve()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    closeBtn.addEventListener('click', close)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close()
    })
    document.addEventListener('keydown', onKey)
    printBtn.addEventListener('click', () => {
      close()
      // 等 modal 关闭动画完成再调 print,避免遮挡打印对话框
      setTimeout(() => printTemplate(tpl, data), 50)
    })
  })
}

function buttonStyle(bg: string, color: string, border = bg): string {
  return `background:${bg};color:${color};border:1px solid ${border};border-radius:4px;padding:4px 16px;font-size:13px;cursor:pointer;`
}
