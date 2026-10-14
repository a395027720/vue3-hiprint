# src/designer — 现代化打印设计器

与 `src/hiprint/`(LGPL 引擎)并列的新实现,目标:用现代技术栈重做一个**易用、易集成、可演进**的打印设计器。

## 设计原则

1. **核心层零依赖**:`core/` 不引用 Vue、不引用 DOM、不引用 jQuery。可独立单测、Node 可跑。
2. **不可变数据**:Template 是个普通对象,所有更新走 `updateElement(template, id, patch)` 模式,返回新 Template。
3. **类型驱动**:TypeScript + 判别联合(discriminated union),`type` 字段区分。
4. **细节需求一等公民**:Table 分页、文本对齐、4 边边框等都是 schema 字段,不是 eval 字符串。

## 目录

```
designer/
├── core/                                ← 纯函数核心,无 DOM
│   ├── types.ts                         ← Element / Template / Paper 类型(10 种元素)
│   ├── schema.ts                        ← updateElement / createElement / factory
│   ├── id.ts                            ← nextId 短 id 生成
│   ├── history.ts                       ← 简单 undo/redo(past/future 栈)
│   ├── render.ts                        ← mmToPx + paginate 分页 IR + renderTemplate HTML
│   └── align.ts                         ← alignHorizontal / alignVertical
├── api/
│   └── useDesigner.ts                   ← 单一 Composition API 入口(模板/选中/多选/历史/缩放/网格)
├── components/
│   ├── PrintDesigner.vue                ← 顶层壳:TopBar + HeaderToolbar + DesignerCanvas + PropertyPanel
│   ├── DesignerCanvas.vue               ← 画布:ruler / 元素 / 框选 / 延长线 / 旋转 / 锁定 / 右键菜单
│   ├── ElementRenderer.vue              ← 单元素渲染(按 type 分发)
│   ├── PropertyPanel.vue                ← 右侧属性面板
│   ├── ElementsPanel.vue                ← 左侧元素面板(浮层,可折叠)
│   ├── HeaderToolbar.vue                 ← 7 组工具条(editor / paper / zoom / hand / panel / quick / system)
│   ├── TextQuickToolbar.vue             ← 选中文本元素时悬浮的字体/字号/对齐工具
│   ├── ContextMenu.vue                  ← 右键菜单
│   ├── TopBar.vue
├── utils/
│   ├── print.ts                         ← iframe 打印 + 预览
│   ├── pdf.ts                           ← jsPDF + html2canvas 导出 PDF
│   └── snap.ts                          ← snapValue() 吸附候选匹配
└── index.ts                             ← 模块入口
```

## 核心 Schema 概览

**Element 判别联合**(10 种):
- `text` — 文本(字体/对齐/换行/装饰/颜色/背景/列表)
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

**尺寸统一 mm**(不沿用 hiprint 的 pt 历史包袱)。

## 核心交互

| 能力 | 行为 |
| --- | --- |
| **框选** | 画布空白 mousedown 启动,虚线选区带 W×H mm 尺寸标签,实时高亮命中元素(锁定元素除外),mouseup 选中所有与选区相交的元素 |
| **多选** | `multiSelectedIds: string[]`(主选 `selectedId` 单独存),Shift+点 toggle,Delete 删多选全部,Esc 清多选 |
| **组拖动** | 点中元素在 multi 集合里时,所有选中元素按主选位移(保持相对位置);吸附候选只对组外元素 + 画布边界 |
| **拖动延长线** | 拖动时从元素/组 4 边各画 1 条贯穿画布到 ruler 的浅蓝虚线,选中状态不显示 |
| **吸附辅助线** | 拖动时元素/组 4 边跟其它元素/画布边界重合,红实线高亮指示对齐 |
| **标尺** | 高端 SVG 标尺,刻度密度随 zoom 自适应,0 位加粗,鼠标在画布上时有红游标 + mm 数 chip,选中元素 4 边在标尺上有蓝色三角标记 |
| **旋转** | 选中元素顶边中点上方有旋转手柄,反向旋转保持图标正向,实时显示度数 |
| **锁定** | 锁定元素不参与框选、不允许拖动/resize/旋转,边框金黄 + 🔒 徽标,右键菜单可解锁 |
| **Resize** | 8 个 handle(4 角 + 4 边),Shift 角 handle 等比,4 mm 最小尺寸 |
| **键盘** | Space 临时 pan,Delete 删多选,Esc 清多选 |
| **撤销/重做** | `add/remove/moveUp/moveDown/bringToFront/sendToBack/copy/cut/paste/setLocked/clearElements/setPaper/load` 入 history;`update` 不入(拖动连续触发,粒度太细) |
| **右键菜单** | 删除/复制/剪切/粘贴 + 置于顶层/底层/上移/下移 + 锁定 + 撤销/重做,按当前状态 enable/disable |
| **JSON 导入导出** | 顶部按钮触发,`version: '1.0'` schema 校验,失败弹提示 |
| **PDF 导出** | 动态 import jspdf + html2canvas,异步生成下载 |
| **JSON 查看** | 顶部按钮弹窗显示当前模板 JSON + 复制 |

## 关键坐标体系

- **所有坐标/尺寸都是 mm**,打印纸张一致(避免 px/pt 转换)
- `mmToPx(mm) = mm * 96/25.4 ≈ 3.78px`(96 DPI 屏幕换算)
- **画布 + 标尺的 frame 绝对像素坐标系**:`canvas left:24, top:24` 在 `.canvas-frame` 内(给 24px ruler 让位);ruler svg 用 viewBox 1:1 对齐 canvas 1px
- **元素** `.canvas-element` 在 `.canvas` 内,`left: mmToPxScaled(e.x)px`
- **延长线 / 吸附线 / 三角标记** 都在 `.canvas-frame` 级,`left: 24 + mmToPxScaled(m)px`,跟元素 left 算法完全一致(像素级对齐,不依赖 viewBox 缩放系数)
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

- **6 个工具按钮**(HeaderToolbar 对齐组):左/水平居中/右 + 顶/垂直居中/底,基于 `alignHorizontal` / `alignVertical` 工具函数
- **4 边吸附**:`DesignerCanvas` 拖动时收集候选(画布 4 边界 + 其它元素 4 边),阈值 1mm,命中时画红色辅助线
- **`utils/snap.ts`** 是手写吸附函数,后续可考虑 `interact.js` 的 snap 插件

## 打印输出

- `printTemplate(tpl, data)`:嵌入隐藏 iframe,`iframe.contentWindow.print()` 触发系统打印对话框
- `previewTemplate(tpl, data)`:新窗口预览
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

// 模板操作
designer.template.value              // Ref<Template>
designer.add('text')                 // 添加元素
designer.update(id, { x: 10 })       // 不可变 patch(不入 history)
designer.remove(id)                  // 删除(入 history)
designer.removeMany([id1, id2])      // 批量删除(多选 Delete)
designer.moveMany([{ id, x, y }])    // 批量移动(组拖动)

// 选中(单选 / 多选)
designer.selectedId                  // Ref<string | null>  主选
designer.multiSelectedIds            // Ref<string[]>         多选集合
designer.select(id | null)           // 单选(同步多选)
designer.selectMany(ids)             // 框选结束
designer.toggleInMulti(id)           // Shift+点
designer.clearSelection()            // Esc

// 层级
designer.moveUp(id) / moveDown(id)
designer.bringToFront(id) / sendToBack(id)

// 剪贴板
designer.copyElement(id) / cutElement(id) / pasteElement(x?, y?)

// 锁定
designer.setLocked(id, locked)

// 缩放 / 网格
designer.zoom / setZoom(0.5 ~ 4) / showGrid / toggleGrid

// 历史
designer.undo() / redo() / canUndo / canRedo

// 状态
designer.dirty / markClean()         // 是否有未保存修改

// JSON
designer.toJson() / loadJson(raw)    // 失败返回 false
```
