/**
 * Template + data → HTML 字符串。
 *
 * 这是"打印"和"画布渲染"共用的核心:输出一个可直接插入 iframe 的
 * 完整 HTML 文档。
 *
 * ## 分页模型
 *
 * 关键洞察:position:absolute 元素**不接受** page-break-before / page-break-after
 * (W3C CSS-Break-3 规定 absolute 元素不参与分页)。所以不能用 CSS 让 absolute
 * 元素"另起一页"。
 *
 * 正确做法是**分两步**:
 * 1. 排版阶段(paginate):把 elements 按 paper 边界 + pageBreakBefore 分到多页
 * 2. 渲染阶段:每个 page 输出一个 <section class="paper">,paper 之间用
 *    page-break-after:always 分页(对 block 元素有效)
 *
 * paper section 是 position:relative 容器,内部 element 仍 absolute,
 * 因为 absolute 是相对最近的 positioned 祖先(即 paper),所以每个 paper
 * 里的 element 都从 paper 自己的 (0,0) 开始 — 自然对齐。
 *
 * MVP 限制:跨页 element(table 行太多撑爆 paper)不做拆分,直接装起始页,
 * 后续 page 继续装后面的 element。rowBreak / repeatHeader 在 table 完整
 * 装在一页时 work,跨页时不保证。
 */

import type { Element, TableElement, Template } from "./types";

/**
 * 4 边独立边框 CSS。读 borderTop/Right/Bottom/Left 字段(任一非空启用该边),
 * 宽度用 borderSize(默认 0.25mm),颜色用 borderColor(默认 #000)。
 */
function borderCss4Sides(b: {
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderSize?: number;
  borderColor?: string;
}): string {
  const size = b.borderSize ?? 0.25;
  const color = b.borderColor ?? "#000";
  const sides: Array<"top" | "right" | "bottom" | "left"> = [
    "top",
    "right",
    "bottom",
    "left",
  ];
  return sides
    .filter(
      (side) =>
        b[`border${side[0].toUpperCase()}${side.slice(1)}` as keyof typeof b],
    )
    .map(
      (side) =>
        `border-${side}:${size}mm ${b[`border${side[0].toUpperCase()}${side.slice(1)}` as keyof typeof b]} ${color};`,
    )
    .join("");
}

/** 4 个内边距 CSS(各自独立,0 或 undefined 不输出) */
function paddingCss4Sides(b: {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}): string {
  const sides: Array<"top" | "right" | "bottom" | "left"> = [
    "top",
    "right",
    "bottom",
    "left",
  ];
  return sides
    .filter((side) => {
      const v = b[
        `padding${side[0].toUpperCase()}${side.slice(1)}` as keyof typeof b
      ] as number | undefined;
      return v && v > 0;
    })
    .map(
      (side) =>
        `padding-${side}:${b[`padding${side[0].toUpperCase()}${side.slice(1)}` as keyof typeof b]}mm;`,
    )
    .join("");
}

// 1mm = 96/25.4 ≈ 3.78px

const pxPerMm = 96 / 25.4;

/** mm → px(用于屏幕画布显示和 HTML 内联) */
export function mmToPx(mm: number): number {
  return mm * pxPerMm;
}

/** 解析 data 路径,如 'rows' / 'a.b.c' / 'a[0].b'。MVP 暂只支持 'a.b' 点路径 */
export function resolveDataPath(data: unknown, path: string): unknown {
  if (!path) return data;
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      data,
    );
}

// ========== 元素 → HTML 片段 ==========

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textStyle(el: Extract<Element, { type: "text" }>): string {
  // 上下对齐 + 左右对齐:用 flex column
  //  - flex-direction:column → 主轴=垂直(cross-axis=水平)
  //  - justify-content(主轴)管 verticalAlign(top/middle/bottom → flex-start/center/flex-end)
  //  - align-items(cross-axis)管 align(left/center/right)
  // 为何不用 row:row + align-items=center 居中需要 cross-axis free space,默认 stretch item 没空间
  const va = el.verticalAlign ?? "top";
  const tw = el.textWrap ?? "normal";
  const wrapCss: Record<typeof tw, string> = {
    normal: "",
    nowrap: "white-space:nowrap;overflow:hidden;",
    "break-word": "word-break:break-all;overflow-wrap:break-word;",
    ellipsis: "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
  };
  const justifyV =
    va === "middle" ? "center" : va === "bottom" ? "flex-end" : "flex-start";
  const alignH =
    el.align === "center"
      ? "center"
      : el.align === "right"
        ? "flex-end"
        : "flex-start";
  return [
    `font-size:${mmToPx(el.fontSize)}px`,
    el.fontWeight ? `font-weight:${el.fontWeight}` : "",
    el.fontStyle && el.fontStyle !== "normal"
      ? `font-style:${el.fontStyle}`
      : "",
    el.color ? `color:${el.color}` : "",
    el.fontFamily ? `font-family:${escapeHtml(el.fontFamily)}` : "",
    el.lineHeight ? `line-height:${el.lineHeight}` : "",
    el.maxLines != null && el.maxLines > 0
      ? `display:-webkit-box;-webkit-line-clamp:${el.maxLines};-webkit-box-orient:vertical;overflow:hidden;`
      : "",
    el.letterSpacing != null ? `letter-spacing:${el.letterSpacing}px` : "",
    el.textDecoration && el.textDecoration !== "none"
      ? `text-decoration:${el.textDecoration}`
      : "",
    el.backgroundColor ? `background-color:${el.backgroundColor}` : "background-color:#ffffff",
    borderCss4Sides(el),
    el.borderRadius ? `border-radius:${el.borderRadius}mm` : "",
    paddingCss4Sides(el),
    `display:flex;flex-direction:column;justify-content:${justifyV};align-items:${alignH};`,
    el.writingMode && el.writingMode !== "horizontal-tb"
      ? `writing-mode:${el.writingMode};text-orientation:mixed;`
      : "",
    wrapCss[tw],
    el.rotate
      ? `transform:rotate(${el.rotate}deg);transform-origin:center;`
      : "",
    el.zIndex != null ? `z-index:${el.zIndex};` : "",
  ]
    .filter(Boolean)
    .join(";");
}

function renderText(
  el: Extract<Element, { type: "text" }>,
  data: unknown,
): string {
  const listType = el.listType ?? "none";
  // variable 字段:绑数据 key(支持点号路径),渲染时优先用 data[variable];空/null/undefined 回退 text
  const raw =
    el.variable && (data != null || el.variable.includes("."))
      ? resolveDataPath(data, el.variable)
      : undefined;
  const text =
    raw != null && raw !== ""
      ? String(raw)
      : el.text;
  const inner =
    listType === "none"
      ? escapeHtml(text)
      : `<${listType} style="margin:0;padding-left:1.2em;">${text
          .split("\n")
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("")}</${listType}>`;
  return `<div class="el-text" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${mmToPx(el.w)}px;height:${mmToPx(el.h)}px;
    box-sizing:border-box;
    line-height:${el.lineHeight ?? 1.2};
    ${textStyle(el)}
  ">${inner}</div>`;
}

function renderImage(el: Extract<Element, { type: "image" }>): string {
  const radiusCss = el.borderRadius
    ? `border-radius:${el.borderRadius}mm;`
    : "";
  return `<div class="el-image" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${mmToPx(el.w)}px;height:${mmToPx(el.h)}px;
    overflow:hidden;box-sizing:border-box;
    ${borderCss4Sides(el)}${radiusCss}${paddingCss4Sides(el)}
  "><img src="${escapeHtml(el.src)}" style="
    width:100%;height:100%;
    object-fit:${el.fit ?? "contain"};
  "/></div>`;
}

function renderTable(el: TableElement, data: unknown): string {
  const rows = Array.isArray(data) ? data : [];
  const colgroup = el.columns
    .map((c) => `<col style="width:${mmToPx(c.width)}px"/>`)
    .join("");

  const classes = [
    "el-table",
    `el-table-rowbreak-${el.rowBreak}`,
    el.repeatHeader ? "el-table-repeat-header" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const thead = `<thead><tr>${el.columns
    .map(
      (c) =>
        `<th style="text-align:${c.align ?? "left"};font-size:${mmToPx(el.fontSize)}px;padding:2px 4px;border:1px solid ${el.borderColor ?? "#000"}">${escapeHtml(c.title)}</th>`,
    )
    .join("")}</tr></thead>`;

  const tbody = `<tbody>${rows
    .map(
      (row) =>
        `<tr>${el.columns
          .map((c) => {
            const v = (row as Record<string, unknown>)?.[c.field];
            return `<td style="text-align:${c.align ?? "left"};font-size:${mmToPx(el.fontSize)}px;padding:2px 4px;border:1px solid ${el.borderColor ?? "#000"}">${escapeHtml(String(v ?? ""))}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</tbody>`;

  return `<div class="${classes}" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${mmToPx(el.w)}px;
  "><table style="
    border-collapse:collapse;width:100%;table-layout:fixed;
  ">${colgroup ? `<colgroup>${colgroup}</colgroup>` : ""}${thead}${tbody}</table></div>`;
}

function renderLine(el: Extract<Element, { type: "line" }>): string {
  return `<div class="el-line" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${mmToPx(el.w)}px;height:0;
    border-top:${el.thickness}px solid ${el.color ?? "#000"};
  ""></div>`;
}

function renderPageNum(el: Extract<Element, { type: "pagenum" }>): string {
  // MVP:打印时浏览器会算 @page,这里静态显示 "第 1 页 / 共 1 页"
  // 完整支持需要 CSS counter + @page { counter-increment: page },留待后续 PR
  const text = el.format.replace("{page}", "1").replace("{total}", "1");
  return `<div class="el-pagenum" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${mmToPx(el.w)}px;height:${mmToPx(el.h)}px;
    box-sizing:border-box;
    display:flex;align-items:center;justify-content:${el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start"};
    font-size:${mmToPx(el.fontSize)}px;
    ${el.fontWeight ? `font-weight:${el.fontWeight};` : ""}
    ${el.color ? `color:${el.color};` : ""}
    ${el.fontFamily ? `font-family:${escapeHtml(el.fontFamily)};` : ""}
  ">${escapeHtml(text)}</div>`;
}

function renderBarcode(el: Extract<Element, { type: "barcode" }>): string {
  // MVP:用 SVG 画一组横线模拟条形码 + value 文本。
  // 完整支持需要 bwip-js / JsBarcode,留待后续 PR。
  const w = mmToPx(el.w);
  const h = mmToPx(el.h);
  const lines: string[] = [];
  const count = Math.max(20, Math.floor(w / 3));
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) continue;
    const x = (i / count) * w;
    const lw = ((i * 7) % 4) + 1;
    lines.push(
      `<rect x="${x.toFixed(1)}" y="0" width="${lw}" height="${(h * 0.75).toFixed(1)}" fill="#000"/>`,
    );
  }
  return `<div class="el-barcode" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${w}px;height:${h}px;box-sizing:border-box;
    background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
  "><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h * 0.75}">${lines.join("")}</svg><div style="font-size:10px;color:#333;margin-top:2px;">${escapeHtml(el.value)}</div></div>`;
}

function renderQrcode(el: Extract<Element, { type: "qrcode" }>): string {
  // MVP:用 SVG 画 21x21 棋盘格模拟二维码 + value 文本。
  // 完整支持需要 qrcode.js,留待后续 PR。
  const w = mmToPx(el.w);
  const h = mmToPx(el.h);
  const size = Math.min(w, h);
  const n = 21;
  const cell = size / n;
  const cells: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // 伪随机填充(基于坐标)
      if ((x * 7 + y * 13 + x * y) % 3 === 0) {
        cells.push(
          `<rect x="${(x * cell).toFixed(1)}" y="${(y * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="#000"/>`,
        );
      }
    }
  }
  return `<div class="el-qrcode" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${w}px;height:${h}px;box-sizing:border-box;
    background:#fff;display:flex;align-items:center;justify-content:center;
  "><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${cells.join("")}</svg></div>`;
}

function renderMultiLabel(
  el: Extract<Element, { type: "multilabel" }>,
): string {
  const w = mmToPx(el.w);
  const h = mmToPx(el.h);
  const gap = 2;
  const cellW = (w - gap * (el.cols - 1)) / el.cols;
  const cellH = 18;
  const items = el.labels
    .slice(0, el.cols * 2)
    .map((l, i) => {
      const c = i % el.cols;
      const r = Math.floor(i / el.cols);
      return `<div style="
      position:absolute;
      left:${(c * (cellW + gap)).toFixed(1)}px;top:${(r * (cellH + gap)).toFixed(1)}px;
      width:${cellW.toFixed(1)}px;height:${cellH}px;
      background:${l.color ?? "#f0f7ff"};border:1px solid #91caff;border-radius:3px;
      display:flex;align-items:center;justify-content:center;
      font-size:${mmToPx(el.fontSize)}px;color:${el.color ?? "#333"};
    ">${escapeHtml(l.text)}</div>`;
    })
    .join("");
  return `<div class="el-multilabel" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${w}px;height:${h}px;box-sizing:border-box;position:absolute;
  ">${items}</div>`;
}

function renderRect(el: Extract<Element, { type: "rect" }>): string {
  return `<div class="el-rect" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${mmToPx(el.w)}px;height:${mmToPx(el.h)}px;
    background:${el.fill ?? "transparent"};
    box-sizing:border-box;
    ${borderCss4Sides(el)}
  "></div>`;
}

function renderCircle(el: Extract<Element, { type: "circle" }>): string {
  return `<div class="el-circle" style="
    position:absolute;
    left:${mmToPx(el.x)}px;top:${mmToPx(el.y)}px;
    width:${mmToPx(el.w)}px;height:${mmToPx(el.h)}px;
    background:${el.fill ?? "transparent"};
    border-radius:50%;
    box-sizing:border-box;
    ${borderCss4Sides(el)}
  "></div>`;
}

export function renderElement(el: Element, data: unknown): string {
  switch (el.type) {
    case "text":
      return renderText(el, data);
    case "image":
      return renderImage(el);
    case "table":
      return renderTable(el, resolveDataPath(data, el.dataPath));
    case "line":
      return renderLine(el);
    case "pagenum":
      return renderPageNum(el);
    case "barcode":
      return renderBarcode(el);
    case "qrcode":
      return renderQrcode(el);
    case "multilabel":
      return renderMultiLabel(el);
    case "rect":
      return renderRect(el);
    case "circle":
      return renderCircle(el);
  }
}

// ========== 分页 IR ==========

/**
 * 把 elements 按 page 边界 + pageBreakBefore 分配到多页。
 * 返回 N 个 page,每个 page 是该页包含的 elements 数组。
 *
 * MVP 规则:
 * - table.pageBreakBefore = true → 强制该 element 进入下一页
 * - 当前 page 已有内容且 element 的 y+h 超出 paper 边界 → 进入下一页
 * - 跨页 element 不做拆分,直接装起始页,后续 page 装后面的 element
 */
export function paginate(tpl: Template): Element[][] {
  const pages: Element[][] = [[]];
  const paperH = tpl.paper.height;

  // 跨所有 pages 收集元素(打印时按 paper 边界二次分页,跟编辑器 pages 是两个概念)
  const all: Element[] = tpl.pages.flatMap((p) => p.elements);

  for (const el of all) {
    let target = pages[pages.length - 1];

    const forceBreak =
      el.type === "table" && (el as TableElement).pageBreakBefore;
    const overflow = target.length > 0 && el.y + el.h > paperH;
    if (forceBreak || overflow) {
      target = [];
      pages.push(target);
    }
    target.push(el);
  }

  return pages.length === 0 ? [[]] : pages;
}

// ========== Template + data → 完整 HTML 文档 ==========

export function renderTemplate(
  tpl: Template,
  data: unknown,
  pageMarginHorizontal = 0,
  pageMarginVertical = 0,
): string {
  const inner = renderInner(
    tpl,
    data,
    pageMarginHorizontal,
    pageMarginVertical,
  );

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><style>
  @page { size: ${tpl.paper.width}mm ${tpl.paper.height}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .el-table-repeat-header thead { display: table-header-group; }
  .el-table-rowbreak-row tr { page-break-inside: avoid; }
  .el-table-rowbreak-auto tr { page-break-inside: auto; }
  ${paperCss(tpl)}
</style></head><body>${inner}</body></html>`;

  console.log(html);
  return html;
}

/**
 * 只输出 <section class="paper">…</section> 列表,不含 doctype / html / body / style。
 * 用于 PreviewModal 这种 v-html 渲染场景(被嵌入父文档,父 style 已经生效,
 * 不需要再写一遍 @page / html,body 等)。
 *
 * pageMarginHorizontal / pageMarginVertical(mm):paper 内的可印刷区域边距,
 * 元素渲染到一个 inset = margin 的内层容器 .paper-content 中。
 */
export function renderInner(
  tpl: Template,
  data: unknown,
  pageMarginHorizontal = 0,
  pageMarginVertical = 0,
): string {
  const paperW = mmToPx(tpl.paper.width);
  const paperH = mmToPx(tpl.paper.height);
  const mh = mmToPx(pageMarginHorizontal);
  const mv = mmToPx(pageMarginVertical);
  const pages = tpl.pages;
  const lastIdx = pages.length - 1;
  console.log(pages);

  return pages
    .map((elements: any, i) => {
      const isLast = i === lastIdx;
      const breakAfter = isLast ? "auto" : "always";
      return `<section class="paper" style="
        position:relative;
        width:${paperW}px;height:${paperH}px;
        page-break-after:${breakAfter};
        overflow:hidden;
      "><div class="paper-content" style="
        position:absolute;
        left:${mh}px;top:${mv}px;right:${mh}px;bottom:${mv}px;
      ">${elements.elements.map((el) => renderElement(el, data)).join("\n")}</div></section>`;
    })
    .join("\n");
}

/** PreviewModal 在父文档中需要补的 paper 样式(非 iframe 环境没有 @page / html,body 等)。 */
function paperCss(tpl: Template): string {
  return `
  .paper { position:relative; background:#fff;  }
  .el-table { font-size:11px; background:#ffffff; }
  .el-table table { width:100%; border-collapse:collapse; table-layout:fixed; }
  .el-table th, .el-table td { border:1px solid #d0d0d0; padding:2px 4px; }
  .el-table th { background:#f5f5f5; font-weight:bold; }
  .el-image img { width:100%; height:100%; display:block; }
  /* 不需要打印分页宽度变量,但保留 paper 尺寸参考 */
  /* paper: ${tpl.paper.width}mm x ${tpl.paper.height}mm */
  `;
}
