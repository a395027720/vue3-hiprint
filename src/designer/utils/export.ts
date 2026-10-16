import type { Template } from "../core/types";
import { mmToPx, renderTemplate } from "../core/render";

/**
 * 把模板导出为一份独立、可直接打开的 HTML 文件。
 *
 * 特点：
 * - 输出是完整的 <!doctype html> 文档，双击即可在浏览器查看
 * - 内联渲染出的 HTML（renderTemplate 已经带了所有样式）
 * - 额外注入一段导出标记样式，去掉预览用的阴影/边距，保持纸面干净
 * - 文件名默认 template.html
 */
export async function exportHtml(
  tpl: Template,
  data: unknown,
  pageMarginHorizontal = 0,
  pageMarginVertical = 0,
  fileName = "template.html",
): Promise<boolean> {
  try {
    // renderTemplate 返回的就是完整 HTML 字符串，直接用
    const raw = renderTemplate(
      tpl,
      data,
      pageMarginHorizontal,
      pageMarginVertical,
    );

    // 解析成文档，方便注入导出专用样式
    const parsed = new DOMParser().parseFromString(raw, "text/html");

    // 确保有 doctype 和 utf-8
    const html = "<!doctype html>\n" + parsed.documentElement.outerHTML;

    // 生成 Blob 并下载
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);

    return true;
  } catch (e) {
    console.error("[designer] exportHtml failed:", e);
    return false;
  }
}

/**
 * 把模板导出为 PDF 文件(直接下载,不弹打印对话框)。
 * 内部用 jsPDF + html2canvas(已声明在 package.json)。
 */
export async function exportPdf(
  tpl: Template,
  data: unknown,
  pageMarginHorizontal = 0,
  pageMarginVertical = 0,
): Promise<boolean> {
  // 动态 import 避免 SSR 报错(jsPDF / html2canvas 都引用了 window)
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // A4 对应的 CSS 像素(96dpi)。显式算出来,后面 html2canvas 用它锁死宽高,
  // 避免浏览器取整导致 canvas 比一页多出 0.5px 而触发多页。
  const paperWpx = Math.round(mmToPx(tpl.paper.width));
  const paperHpx = Math.round(mmToPx(tpl.paper.height));

  // 用主文档里的隐藏容器挂载 HTML,而不是 iframe。
  // 关键:不能用 display:none(会丢失布局),用 fixed + 移出视口。
  // 高度先按一页算,等渲染完知道有几页后再展开,避免多页被 overflow:hidden 裁掉。
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${paperWpx}px`,
    `height:${paperHpx}px`,
    "background:#fff",
    "overflow:hidden",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(host);

  try {
    // 把模板渲染出的完整 HTML 写入 host。
    // 用 DOMParser 解析,只取 <body> 里的内容,避免 <html>/<head> 被塞进 div 里。
    const html = renderTemplate(
      tpl,
      data,
      pageMarginHorizontal,
      pageMarginVertical,
    );
    const parsed = new DOMParser().parseFromString(html, "text/html");

    // 把 <style> 也搬过来,否则样式全丢
    parsed.querySelectorAll("style").forEach((styleEl) => {
      host.appendChild(styleEl.cloneNode(true));
    });
    // 再把 body 的内容搬过来
    parsed.body.childNodes.forEach((node) => {
      host.appendChild(node.cloneNode(true));
    });

    // 等字体加载完。字体没就绪时 html2canvas 渲染文字会出乱码/丢字。
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // 等图片/异步资源就绪。简单场景用 rAF + 短延时;
    // 有远程图片时可以用下面的 waitForImages。
    await waitForImages(host);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => setTimeout(r, 50));

    const papers = Array.from(host.querySelectorAll<HTMLElement>(".paper"));
    if (papers.length === 0) {
      console.error("[designer] exportPdf: .paper not found");
      return false;
    }

    // 展开 host 高度,让多页都能在容器内正常布局,避免被 overflow:hidden 裁掉。
    host.style.height = `${paperHpx * papers.length}px`;
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => setTimeout(r, 50));

    // 用 canvas 直接出 PDF,每张 paper 对应 PDF 一页,不做任何自动分页。
    const pdf = new jsPDF({
      unit: "mm",
      format: [tpl.paper.width, tpl.paper.height],
      orientation:
        tpl.paper.width > tpl.paper.height ? "landscape" : "portrait",
    });

    for (let i = 0; i < papers.length; i++) {
      const paperEl = papers[i]!;
      // 显式锁死截图区域,杜绝因布局取整多出零点几像素导致的多页空白。
      const canvas = await html2canvas(paperEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: paperWpx,
        height: paperHpx,
        windowWidth: paperWpx,
        windowHeight: paperHpx,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: "#ffffff",
      });

      if (i > 0) {
        pdf.addPage(
          [tpl.paper.width, tpl.paper.height],
          tpl.paper.width > tpl.paper.height ? "landscape" : "portrait",
        );
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(
        imgData,
        "JPEG",
        0,
        0,
        tpl.paper.width,
        tpl.paper.height,
        undefined,
        "FAST",
      );
    }

    pdf.save("template.pdf");
    return true;
  } catch (e) {
    console.error("[designer] exportPdf failed:", e);
    return false;
  } finally {
    host.remove();
  }
}

/**
 * 把模板导出为图片并下载。
 *
 * @param tpl                    模板
 * @param data                   渲染数据
 * @param pageMarginHorizontal   水平页边距
 * @param pageMarginVertical     垂直页边距
 * @param options.format         "png" | "jpeg",默认 png
 * @param options.quality        jpeg 质量(0-1),默认 0.95
 * @param options.fileName       文件名,默认 template.png/jpg
 * @param options.mode           "first" 只导第一页 | "all" 所有页纵向拼接,默认 all
 */
export async function exportImage(
  tpl: Template,
  data: unknown,
  pageMarginHorizontal = 0,
  pageMarginVertical = 0,
  options: {
    format?: "png" | "jpeg";
    quality?: number;
    fileName?: string;
    mode?: "first" | "all";
  } = {},
): Promise<boolean> {
  const { format = "png", quality = 0.95, fileName, mode = "all" } = options;

  console.log(
    "[designer] exportImage",
    tpl,
    data,
    pageMarginHorizontal,
    pageMarginVertical,
    options,
  );

  const { default: html2canvas } = await import("html2canvas");

  // 与 exportPdf 一致的像素基准
  const paperWpx = Math.round(mmToPx(tpl.paper.width));
  const paperHpx = Math.round(mmToPx(tpl.paper.height));

  // 主文档隐藏容器(不能用 display:none,否则丢失布局)
  // 高度先按一页算,等渲染完知道有几页后再展开,避免多页被 overflow:hidden 裁掉。
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${paperWpx}px`,
    `height:${paperHpx}px`,
    "background:#fff",
    "overflow:hidden",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(host);

  try {
    // 渲染并挂载
    const html = renderTemplate(
      tpl,
      data,
      pageMarginHorizontal,
      pageMarginVertical,
    );
    const parsed = new DOMParser().parseFromString(html, "text/html");
    parsed.querySelectorAll("style").forEach((styleEl) => {
      host.appendChild(styleEl.cloneNode(true));
    });
    parsed.body.childNodes.forEach((node) => {
      host.appendChild(node.cloneNode(true));
    });

    // 等字体和图片
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await waitForImages(host);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => setTimeout(r, 50));

    const papers = Array.from(host.querySelectorAll<HTMLElement>(".paper"));
    if (papers.length === 0) {
      console.error("[designer] exportImage: .paper not found");
      return false;
    }

    // 展开 host 高度,让多页都能在容器内正常布局。
    host.style.height = `${paperHpx * papers.length}px`;
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => setTimeout(r, 50));

    // 选择要截的页面
    const targets = mode === "all" ? papers : [papers[0]];

    // 逐页截图
    const canvases: HTMLCanvasElement[] = [];
    for (const paperEl of targets) {
      const canvas = await html2canvas(paperEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: paperWpx,
        height: paperHpx,
        windowWidth: paperWpx,
        windowHeight: paperHpx,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: format === "jpeg" ? "#ffffff" : null,
      });
      canvases.push(canvas);
    }

    // 单页直接用;多页时纵向拼接
    const outCanvas =
      canvases.length === 1 ? canvases[0] : stackVertically(canvases);

    // 生成 Blob 并下载
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const ext = format === "jpeg" ? "jpg" : "png";
    const finalFileName = fileName ?? `template.${ext}`;

    const blob = await new Promise<Blob | null>((resolve) =>
      outCanvas.toBlob(resolve, mime, quality),
    );
    if (!blob) {
      console.error("[designer] exportImage: toBlob returned null");
      return false;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalFileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);

    return true;
  } catch (e) {
    console.error("[designer] exportImage failed:", e);
    return false;
  } finally {
    host.remove();
  }
}

/**
 * 等 host 里所有 <img> 加载完成(含已缓存的)。
 * 有超时保护,避免某张图挂掉导致整个导出卡死。
 */
function waitForImages(root: HTMLElement, timeout = 3000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();

  const tasks = imgs.map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve();
          return;
        }
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }),
  );

  return Promise.race([
    Promise.all(tasks).then(() => undefined),
    new Promise<void>((r) => setTimeout(r, timeout)),
  ]);
}

/** 把多张 canvas 纵向拼成一张 */
function stackVertically(canvases: HTMLCanvasElement[]): HTMLCanvasElement {
  const width = Math.max(...canvases.map((c) => c.width));
  const height = canvases.reduce((sum, c) => sum + c.height, 0);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  let y = 0;
  for (const c of canvases) {
    // 居中摆放(宽度不同时)
    const x = Math.floor((width - c.width) / 2);
    ctx.drawImage(c, x, y);
    y += c.height;
  }
  return out;
}
