/**
 * PDF 导出工具。
 *
 * 流程:把 Template + data 渲染成完整 HTML 塞到隐藏 iframe,
 * 等待内容/资源加载完后,用 jsPDF 的 .html() (内部走 html2canvas)
 * 把整个文档截成 canvas,再嵌进 PDF。
 *
 * MVP 限制:
 * - 多页 paginate:目前 jsPDF.html() 会把整页 HTML 当成一个 long page 输出,
 *   不会按 paper 高度分页。简单解决:把 paper 尺寸作为 PDF 单页格式,
 *   内容超出单页时按 CSS 自然回流(由 print-lock.css 决定)。
 *   严格分页需要手动按 paginate() 切页 + jsPDF.addPage,留待后续 PR。
 * - 中文/特殊字体:html2canvas 截图保证视觉一致,不存在字体替换问题。
 */

import type { Template } from '../core/types'
import { renderTemplate } from '../core/render'

/**
 * 把模板导出为 PDF 文件(直接下载,不弹打印对话框)。
 * 内部用 jsPDF + html2canvas(已声明在 package.json)。
 */
export async function exportPdf(tpl: Template, data: unknown): Promise<boolean> {
  // 动态 import 避免 SSR 报错(jsPDF 引用了 window)
  const { jsPDF } = await import('jspdf')
  // 临时隐藏 iframe
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    return false
  }
  doc.open()
  doc.write(renderTemplate(tpl, data))
  doc.close()

  // 等资源(images/canvas/svg)异步加载完
  await new Promise<void>((r) => setTimeout(r, 200))
  if (doc.readyState !== 'complete') {
    await new Promise<void>((r) => {
      iframe.addEventListener('load', () => r(), { once: true })
      setTimeout(r, 1500) // 最长等 1.5s
    })
  }

  const root = doc.documentElement
  try {
    const pdf = new jsPDF({
      unit: 'mm',
      format: [tpl.paper.width, tpl.paper.height],
      orientation: tpl.paper.width > tpl.paper.height ? 'landscape' : 'portrait',
    })
    await pdf.html(root, {
      x: 0,
      y: 0,
      width: tpl.paper.width,
      windowWidth: root.scrollWidth,
      autoPaging: 'text', // 自动按内容分页
      html2canvas: { scale: 2, useCORS: true, logging: false },
    })
    pdf.save('template.pdf')
    return true
  } catch (e) {
    console.error('[designer] exportPdf failed:', e)
    return false
  } finally {
    iframe.remove()
  }
}
