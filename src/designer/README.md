# src/designer — 现代化打印设计器

与 `src/hiprint/`(LGPL 引擎)并列的新实现,目标:用现代技术栈重做一个**易用、易集成、可演进**的打印设计器。

## 设计原则

1. **核心层零依赖**:`core/` 不引用 Vue、不引用 DOM、不引用 jQuery。可独立单测、Node 可跑。
2. **不可变数据**:Template 是个普通对象,所有更新走 `updateElement(template, pageIndex, id, patch)` 模式,返回新 Template。
3. **类型驱动**:TypeScript + 判别联合(discriminated union),`type` 字段区分。
4. **细节需求一等公民**:Table 分页、文本对齐、4 边边框等都是 schema 字段,不是 eval 字符串。

## 目录

```
designer/
├── core/                                ← 纯函数核心,无 DOM
│   ├── types.ts                         ← Element / Template / Paper 类型(10 种元素)
│   ├── schema.ts                        ← updateElement / createElement / addElement / removeElement
│   ├── id.ts                            ← nextId 短 id 生成
│   ├── history.ts                       ← 简单 undo/redo(past/future 栈)
│   ├── render.ts                        ← mmToPx + paginate 分页 IR + renderTemplate HTML
│   ├── align.ts                         ← alignHorizontal / alignVertical
│   ├── elementStyle.ts                  ← 元素 → CSS 样式映射
│   ├── fieldSchema.ts                   ← 属性面板字段定义(按元素类型分 section)
│   ├── palette.ts                       ← 颜色板常量
│   ├── units.ts                         ← 单位换算辅助
│   └── __tests__/                       ← Node 可运行的单元测试(align/history/render/schema)
├── api/
│   └── useDesigner.ts                   ← 单一 Composition API 入口(模板/选中/多选/历史/缩放/网格/多页/参考线)
├── composables/
│   └── useCanvasDrag.ts                 ← 画布拖动事务(元素拖拽、resize、旋转)
├── components/
│   ├── PrintDesigner.vue                ← 顶层壳
│   ├── canvas/
│   │   ├── DesignerCanvas.vue           ← 画布:元素 / 框选 / 拖动 / 吸附 / 旋转 / 锁定
│   │   ├── ElementOverlayHandles.vue    ← 选中元素的 resize handle + 旋转手柄
│   │   ├── GuideOverlay.vue             ← 用户自定义参考线渲染
│   │   └── SnapAndSelfLinesOverlay.vue  ← 吸附红线 + 延长虚线
│   ├── elements/                        ← 10 种元素独立组件
│   │   ├── ElementRenderer.vue          ← 路由壳,按 type 派发
│   │   ├── TextElement.vue
│   │   ├── ImageElement.vue
│   │   ├── TableElement.vue
│   │   ├── LineElement.vue
│   │   ├── PageNumElement.vue
│   │   ├── BarcodeElement.vue
│   │   ├── QrcodeElement.vue
│   │   ├── MultiLabelElement.vue
│   │   ├── RectElement.vue
│   │   └── CircleElement.vue
│   ├── layout/                          ← 顶栏 / 工具条 / 面板 / 标尺 / 状态栏
│   │   ├── TopBar.vue
│   │   ├── HeaderToolbar.vue            ← 对齐 / 分布 / 缩放 / 网格等工具组
│   │   ├── ElementsPanel.vue            ← 左侧元素面板
│   │   ├── PropertyPanel.vue            ← 右侧属性面板
│   │   ├── PaperSettings.vue            ← 纸张 / 页边距 / 表头表脚设置
│   │   ├── StatusBar.vue                ← 底部状态栏(坐标 / 尺寸 / 缩放)
│   │   └── Ruler.vue                    ← SVG 标尺
│   ├── floating/                        ← 浮层组件
│   │   ├── TextQuickToolbar.vue         ← 选中文本时悬浮工具
│   │   ├── PreviewModal.vue             ← 打印预览弹窗
│   │   ├── ContextMenu.vue              ← 右键菜单
│   │   └── Modal.vue                    ← 通用弹窗壳
│   ├── fields/                          ← 属性面板字段子组件
│   │   └── FieldRow.vue
│   └── common/
│       └── ColorPicker.vue              ← 颜色选择器
├── etypes/                              ← 元素类型配置(字段分组 + 默认属性)
│   ├── base.ts                          ← 公共字段(位置/尺寸/边框/内边距/字体)
│   ├── text.ts
│   ├── image.ts
│   ├── table.ts
│   ├── line.ts
│   ├── pagenum.ts
│   ├── barcode.ts
│   ├── qrcode.ts
│   ├── multilabel.ts
│   ├── rect.ts
│   └── circle.ts
├── utils/
│   ├── print.ts                         ← iframe 打印 + 预览
│   ├── pdf.ts                           ← jsPDF + html2canvas 导出 PDF
│   ├── export.ts                        ← 模板 JSON 导出
│   ├── snap.ts                          ← snapValue() 吸附候选匹配
│   └── color.ts                         ← 颜色转换辅助
└── index.ts                             ← 模块入口
```

## 核心 Schema 概览

**Element 判别联合**(10 种):
- `text` — 文本(字体/对齐/换行/装饰/颜色/背景/列表/竖排)
- `image` — 图片(src/fit)
- `table` — 表格(columns/dataPath + `pageBreakBefore`/`rowBreak`/`repeatHeader` 一等公民)
- `line` — 线条(thickness/color)
- `pagenum` — 页码(`{page}` / `{total}` 占位符)
- `barcode` — 条形码(基于 bwip-js,`code128` / `ean13` / ...)
- `qrcode` — 二维码(errorLevel L/M/H)
- `multilabel` — 多标签(每行多列,常用于标签打印)
- `rect` / `circle` — 几何图形

**BaseElement 共享**:
- 位置/尺寸:`x` / `y` / `w` / `h`(mm)
- 边框:`borderTop/Right/Bottom/Left`(style)+ `borderSize` + `borderColor` + `borderRadius`
- 内边距:`paddingTop/Right/Bottom/Left`(mm,4 边独立)
- 旋转/层级/锁定:`rotate` / `zIndex` / `locked`
- 打印开关:`print`(默认 true)

**Template**:
- `version: '1.0'`
- `paper: Paper`(宽/高 mm)
- `pages: Page[]`,每页含 `id` + `elements: Element[]`

**尺寸统一 mm**(不沿用 hiprint 的 pt 历史包袱)。

## 核心交互

| 能力 | 行为 |
| --- | --- |
| **框选** | 画布空白 mousedown 启动,虚线选区带 W×H mm 尺寸标签,实时高亮命中元素(锁定元素除外),mouseup 选中所有与选区相交的元素 |
| **多选** | `multiSelectedIds: string[]`(主选 `selectedId` 单独存),Shift+点 toggle,Delete 删多选全部,Esc 清多选 |
| **组拖动** | 点中元素在 multi 集合里时,所有选中元素按主选位移(保持相对位置);吸附候选只对组外元素 + 画布边界 |
| **拖动延长线** | 拖动时从元素/组 4 边各画 1 条贯穿画布到 ruler 的浅蓝虚线,选中状态不显示 |
| **吸附辅助线** | 拖动时元素/组 4 边跟其它元素/画布边界重合,红实线高亮指示对齐 |
| **标尺** | SVG 标尺,刻度密度随 zoom 自适应,0 位加粗,鼠标在画布上时有红游标 + mm 数 chip,选中元素 4 边在标尺上有蓝色三角标记 |
| **参考线** | 用户可从标尺拖出水平/垂直参考线,元素拖动时参考线也是吸附候选 |
| **旋转** | 选中元素顶边中点上方有旋转手柄,反向旋转保持图标正向,实时显示度数 |
| **锁定** | 锁定元素不参与框选、不允许拖动/resize/旋转,边框金黄 + 🔒 徽标,右键菜单可解锁 |
| **Resize** | 8 个 handle(4 角 + 4 边),Shift 角 handle 等比,4 mm 最小尺寸 |
| **方向键** | 选中元素时按方向键微调位置(HeaderToolbar 实现),每次 1mm,Shift 加速 |
| **撤销/重做** | `add/remove/moveUp/moveDown/bringToFront/sendToBack/copy/cut/paste/setLocked/clearElements/setPaper/load` 入 history;`update` 不入(拖动连续触发,粒度太细) |
| **右键菜单** | 删除/复制/剪切/粘贴 + 置于顶层/底层/上移/下移 + 锁定 + 撤销/重做,按当前状态 enable/disable |
| **多页** | Template 支持 `pages[]`,可增/删/复制/移动页;拖入元素时传入 `pageIndex` |
| **表头表脚** | 每页可配置 header/footer 区域高度与分隔线(颜色/宽度/样式/跨度) |
| **对齐 / 分布 / 匹配尺寸** | 多选时支持左/中/右/顶/中/底对齐、水平/垂直等距分布、以主选为基准匹配宽高 |
| **JSON 导入导出** | 顶部按钮触发,`version: '1.0'` schema 校验,失败弹提示 |
| **PDF 导出** | 动态 import jspdf + html2canvas,异步生成下载 |
| **打印预览** | 弹窗显示当前模板渲染结果 |

## 关键坐标体系

- **所有坐标/尺寸都是 mm**,打印纸张一致(避免 px/pt 转换)
- `mmToPx(mm) = mm * 96/25.4 ≈ 3.78px`(96 DPI 屏幕换算)
- **画布 + 标尺的 frame 绝对像素坐标系**:`canvas left:24, top:24` 在 `.canvas-frame` 内(给 24px ruler 让位);ruler svg 用 viewBox 1:1 对齐 canvas 1px
- **元素** `.canvas-element` 在 `.canvas` 内,`left: mmToPxScaled(e.x)px`
- **延长线 / 吸附线 / 三角标记 / 参考线** 都在 `.canvas-frame` 级,`left: 24 + mmToPxScaled(m)px`,跟元素 left 算法完全一致(像素级对齐,不依赖 viewBox 缩放系数)
- **标尺内 svg 元素**(刻度/文字/鼠标游标)用 viewBox 坐标 = `mmToPxScaled(m)`,**禁止** 加 +24(viewBox 0 = svg 0 = frame 24 = canvas 0mm,1:1 缩放)
- **修改三角 / 延长线坐标时**:优先用 frame 级 absolute div + `24 + mmToPxScaled`,不要在 svg viewBox 里加 +24(踩过的坑)

## 关键 z-index

| 层 | z-index | 用途 |
| --- | --- | --- |
| self-line(延长虚线) | 2 | 拖动时元素 4 边延长线 |
| snap-line(吸附红线) | 4 | 吸附命中候选线(盖在 self-line 上) |
| ruler(标尺) | 5 | 标尺始终在最上,不被线盖住 |
| mark-tri(选中三角) | 6 | 选中元素位置三角(在 ruler 之上) |

## 排版模型

**关键洞察**:`position: absolute` 元素**不接受** `page-break-before`(CSS-Break-3 规定 absolute 不参与分页)。所以不能用 CSS 让 absolute 元素"另起一页"。

正确做法:
1. **排版阶段** `paginate(tpl)`:按 paper 边界 + `pageBreakBefore` 把 elements 分配到多页
2. **渲染阶段**:每个 page 输出一个 `<section class="paper">`,paper 之间用 `page-break-after: always` 分隔(block 元素有效)
3. element 在 paper 内仍 absolute(画布坐标),但 absolute 相对最近的 positioned 祖先 = paper,所以每个 paper 里的 element 都从 paper 自己的 (0,0) 开始

**MVP 限制**:跨页 element(table 行撑爆 paper)不拆分,只装起始页,后续 page 装后面的 element。rowBreak / repeatHeader 在 table 完整装在一页时 work,跨页时不保证。

## 对齐 + 吸附

- **6 个对齐按钮**(HeaderToolbar 对齐组):左/水平居中/右 + 顶/垂直居中/底,基于 `alignHorizontal` / `alignVertical` 工具函数
- **等距分布**:选中 ≥3 个元素时,沿水平或垂直轴等距排列
- **匹配尺寸**:以主选元素为基准,批量统一宽高
- **4 边吸附**:`DesignerCanvas` 拖动时收集候选(画布 4 边界 + 其它元素 4 边 + 参考线),阈值 1mm,命中时画红色辅助线
- **`utils/snap.ts`** 是手写吸附函数,后续可考虑 `interact.js` 的 snap 插件

## 打印输出

- `printTemplate(tpl, data)`:嵌入隐藏 iframe,`iframe.contentWindow.print()` 触发系统打印对话框
- `PreviewModal.vue`:打印预览弹窗(基于 v-html,接收 `renderInner(tpl, data)` 产出的 `<section class="paper">…` 列表,父文档样式接管排版)
- `exportPdf(tpl, data)`:动态 import jspdf + html2canvas,异步生成下载
- CSS:`@page { size: paper; margin: 0 }` + `.paper { page-break-after: always }` + table 分页策略类

## 与老 `src/hiprint/` 的关系

- 老代码 0 改动(LGPL + 向后兼容)
- demo 站第 5 个入口"新设计器(实验)"接入 App.vue
- npm 包导出仍是老的,新设计器在 demo 站可用,npm 子路径发布留后续 PR

## 用法(demo 站)

```bash
npm run dev
# 默认:http://localhost:3000  → 5-tab demo 列表(原 App.vue 入口)
# 全屏:http://localhost:3000/#/designer  → 独立新设计器,无 antd 顶栏与 tab 切换,画布撑满视口
```

全屏入口来自 `src/demo/new-designer/Standalone.vue` + `main.js` 顶层 hash 分支。
工具栏与三栏布局与 tab 入口的 `printNewDesigner` 保持一致,仅去掉 `a-card` / `a-page-header` 包装,
画布高度从 720px 改为 `calc(100vh - 64px)`。

或在自己项目里直接用(待 npm 子路径发布):

```ts
import {
  PrintDesigner,
  useDesigner,
  printTemplate,
  createTemplate,
  type Template,
  type Element,
  type TextElement,
} from '@jake-gao/vue3-hiprint/designer'
```

## useDesigner 主要 API

```ts
const designer = useDesigner({ template: createTemplate() })

// 模板 / 页面
designer.template.value              // Ref<Template>
designer.currentPageIndex.value      // Ref<number>
designer.add('text', pageIndex, { x, y })
designer.update(id, patch, pageIndex)
designer.remove(id, pageIndex)
designer.duplicate(id, pageIndex)
designer.clearElements()

// 页面操作
designer.setPaper(paper)
designer.addPage()
designer.copyPage(pageIndex)
designer.movePage(fromIndex, toIndex)
designer.removePage(pageIndex)

// 选中(单选 / 多选)
designer.selectedId                  // Ref<string | null>  主选
designer.multiSelectedIds            // Ref<string[]>         多选集合
designer.selected                    // ComputedRef<Element | null>
designer.select(id | null)
designer.selectMany(ids)
designer.toggleInMulti(id)
designer.selectAllElements()
designer.clearSelection()

// 层级 / 对齐 / 分布
designer.moveUp(id) / moveDown(id)
designer.bringToFront(id) / sendToBack(id)
designer.alignSelectedElements(mode)         // 'left'|'center'|'right'|'top'|'middle'|'bottom'
designer.distributeSelectedElements(axis)    // 'horizontal'|'vertical'
designer.matchSelectedElementsSize(mode)     // 'width'|'height'|'both'

// 剪贴板
designer.copyElement(id) / cutElement(id, pageIndex) / pasteElement(x?, y?, pageIndex)
designer.hasClipboard                 // ComputedRef<boolean>

// 锁定
designer.setLocked(id, locked, pageIndex)
designer.toggleLock()

// 缩放 / 网格 / 画布样式
designer.zoom / setZoom(0.25 ~ 4)
designer.showGrid / toggleGrid
designer.canvasBackground / setCanvasBackground
designer.pageMarginHorizontal / setPageMarginHorizontal
designer.pageMarginVertical / setPageMarginVertical
designer.allowDragOutsideCanvas / setAllowDragOutsideCanvas

// 表头 / 表脚分隔线
designer.headerLineColor / setHeaderLineColor
designer.headerLineWidth / setHeaderLineWidth
designer.headerLineStyle / setHeaderLineStyle
designer.headerLineSpan / setHeaderLineSpan
designer.headerLineSpanMode / setHeaderLineSpanMode
designer.headerHeight / setHeaderHeight
designer.showHeaderLine / toggleShowHeaderLine
designer.footerLineColor / setFooterLineColor
// ... 页脚对应 setter 与 header 对称

// 参考线
designer.guides                       // Ref<Guide[]>
designer.highlightedGuideId           // Ref<string | null>
designer.addGuide(axis, position)
designer.updateGuide(id, patch)
designer.removeGuide(id)
designer.setHighlightedGuide(id)

// 历史
designer.undo() / redo() / canUndo / canRedo

// 状态
designer.dirty / markClean()

// JSON
designer.toJson() / loadJson(raw)
```

## 测试

`core/` 层零依赖,可直接用 Node 运行测试:

```bash
node src/designer/core/__tests__/align.test.mjs
node src/designer/core/__tests__/history.test.mjs
node src/designer/core/__tests__/render.test.mjs
node src/designer/core/__tests__/schema.test.mjs
```

测试覆盖对齐计算、history 状态机、分页渲染、schema 不可变更新等核心逻辑。

## 关键全局对象

- `hiprint`:核心命名空间（导出自 `hiprint.bundle.js`）,含 `PrintTemplate`、`PrintElementTypeManager`、`init({ host, token, lang, providers })`。
- `window.hiprint` / `window.vue3Hiprint`:浏览器全局变量名（两者都暴露,方便兼容老版本 `vue-plugin-hiprint`）。
- `defaultElementTypeProvider`:默认拖拽元素 provider,用户通过 `new defaultElementTypeProvider()` 实例化后传入 `hiprint.init({ providers: [...] })`。
- `hiPrintPlugin`:Vue 3 插件对象,`app.use(hiPrintPlugin, '$hiPrint', autoConnect)` 后注入 `this.$hiPrint`、`this.$print`、`this.$print2`。
