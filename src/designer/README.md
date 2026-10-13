# src/designer — 现代化打印设计器

与 `src/hiprint/`(LGPL 引擎)并列的新实现,目标:用现代技术栈重做一个**易用、易集成、可演进**的打印设计器。

## 设计原则

1. **核心层零依赖**:`core/` 不引用 Vue、不引用 DOM、不引用 jQuery。可独立单测、Node 可跑。
2. **不可变数据**:Template 是个普通对象,所有更新走 `updateElement(template, id, patch)` 模式,返回新 Template。
3. **类型驱动**:TypeScript + 判别联合(discriminated union),`type` 字段区分。
4. **细节需求一等公民**:Table 分页、文本对齐、4 边边框等都是 schema 字段,不是 eval 字符串。
5. **不绑 UI 库**:`PropertyPanel` 用原生 Vue + input,demo 用 antd-vue 包装,其它 UI 库各自适配。

## 目录

```
designer/
├── core/                                ← 纯函数核心,无 DOM
│   ├── types.ts                         ← Element / Template / Paper 类型
│   ├── schema.ts                        ← updateElement / createElement / factory
│   ├── id.ts                            ← nextId 短 id 生成
│   ├── fieldSchema.ts                   ← FieldDef / SectionDef / Category 声明式
│   ├── align.ts                         ← alignHorizontal / alignVertical
│   ├── render.ts                        ← paginate 分页 IR + renderTemplate HTML
│   └── __tests__/                       ← node:test 单元测试
│       ├── schema.test.mjs
│       ├── render.test.mjs
│       └── align.test.mjs
├── api/
│   └── useDesigner.ts                   ← 单一 Composition API 入口
├── components/
│   ├── PrintDesigner.vue                ← 主组件(三栏布局)
│   ├── ElementPalette.vue               ← 左侧可拖拽元素列表
│   ├── DesignerCanvas.vue               ← 中间画布 + 拖拽 + 4 边吸附 + 红色辅助线
│   ├── PropertyPanel.vue                ← 右侧属性面板(a-tabs 分组)
│   ├── FieldRow.vue                     ← 通用字段控件(由 FieldDef 描述)
│   └── ElementRenderer.vue              ← 画布上单个元素的渲染
├── utils/
│   ├── print.ts                         ← iframe 打印入口
│   └── snap.ts                          ← 吸附工具(后续替换为 interact.js)
└── index.ts                             ← 模块入口
```

## 核心 Schema 概览

**Element 判别联合**(4 种):
- `text` — 文本(fontSize/fontFamily/lineHeight/letterSpacing/align/verticalAlign/textWrap/textDecoration/fontWeight/color/backgroundColor/...)
- `image` — 图片(src/fit + 边框/内边距/旋转/层级)
- `table` — 表格(columns/dataPath/fontSize + `pageBreakBefore`/`rowBreak`/`repeatHeader` 一等公民)
- `line` — 线条(thickness/color)

**BaseElement 共享**:
- 位置/尺寸:`x`/`y`/`w`/`h`(mm)
- 边框:`borderTop/Right/Bottom/Left`(style)+ `borderSize` + `borderColor` + `borderRadius`(4 边独立 + 全局粗细/颜色,学 hiprint)
- 内边距:`paddingTop/Right/Bottom/Left`(mm,4 边独立)
- 旋转/层级:`rotate` / `zIndex`

**尺寸统一 mm**(不沿用 hiprint 的 pt 历史包袱)。

## 排版模型

**关键洞察**:`position: absolute` 元素**不接受** `page-break-before`(CSS-Break-3 规定 absolute 不参与分页)。所以不能用 CSS 让 absolute 元素"另起一页"。

正确做法:
1. **排版阶段** `paginate(tpl)`:按 paper 边界 + `pageBreakBefore` 把 elements 分配到多页
2. **渲染阶段**:每个 page 输出一个 `<section class="paper">`,paper 之间用 `page-break-after: always` 分隔(block 元素有效)
3. element 在 paper 内仍 absolute(画布坐标),但 absolute 相对最近的 positioned 祖先 = paper,所以每个 paper 里的 element 都从 paper 自己的 (0,0) 开始

**MVP 限制**:跨页 element(table 行撑爆 paper)不拆分,只装起始页,后续 page 装后面的 element。rowBreak / repeatHeader 在 table 完整装在一页时 work,跨页时不保证。

## 属性面板分组(4 个 tab)

`SectionDef` 带 `category: 'base' | 'style' | 'border' | 'advanced' | 'columns'`,`groupByCategory()` 分桶,`<a-tabs>` 渲染:

| Element | 基础 | 样式 | 边框 | 高级 | 列 |
|---|---|---|---|---|---|
| text | 文本内容 | 字体/对齐/换行/装饰/颜色/背景/旋转/层级 | 4 边独立 + 大小/颜色/圆角 + 4 内边距 | — | — |
| image | URL | 填充方式 | 同上 | — | — |
| table | 数据路径/字号 | — | — | 分页策略(另起一页/行内不跨页/跨页重复表头) | 列编辑 |
| line | 粗细/颜色 | — | 同上 | — | — |

`FieldSchema` 是声明式层 — 新增 element type 只需在 `TYPE_SECTIONS` 加 entry,PropertyPanel 自动出 UI。

## 对齐 + 吸附

- **6 个工具按钮**(demo 顶栏):左/水平居中/右 + 顶/垂直居中/底,基于 `alignHorizontal` / `alignVertical` 工具函数
- **4 边吸附**:`DesignerCanvas` 拖动时收集候选(画布 4 边界 + 其它元素 4 边),阈值 1mm,命中时画红色辅助线
- **TODO**:`utils/snap.ts` 是 22 行手写,后续 PR 替换为 `interact.js` 的 snap 插件

## 打印输出

- `renderTemplate(tpl, data)` 输出完整 HTML 文档
- 嵌入隐藏 iframe,`iframe.contentWindow.print()` 触发系统打印对话框
- CSS:`@page { size: paper; margin: 0 }` + `.paper { page-break-after: always }` + table 分页策略类

## 测试

```bash
npm test
```

- 28 个 case,覆盖 schema 不可变 / render HTML 结构 / align 计算
- 用 Node 18+ 内置 `node:test`,无 vitest 依赖
- `scripts/build-test.mjs` 用 esbuild JS API 预编译 .ts → `dist-test/`,然后 node 跑测试

## 范围(MVP)

**做**:
- 4 种元素(text/image/table/line)+ 拖拽/选中/移动 + 4 边吸附
- 属性面板完整覆盖 text 常用属性(字体/对齐/换行/修饰/颜色/背景/旋转/层级)
- table 分页一等公民(`pageBreakBefore` / `rowBreak` / `repeatHeader`)
- 6 个对齐工具 + 属性面板 a-tabs 分组(基础/样式/边框/高级/列)
- iframe 打印 + JSON 导入导出

**不做**(后续 PR):
- resize 句柄(选中元素 4 角拖拽改尺寸)
- 撤销/重做(shallowRef + history stack)
- 跨页 table 行拆分
- 表达式引擎(`{{price * qty}}` 替代 eval)
- 表格合并 / 复杂表头
- PDF 导出 / 旋转 / 客户端 socket 直连

## 与老 `src/hiprint/` 的关系

- 老代码 0 改动(LGPL + 向后兼容)
- demo 站第 5 个入口"新设计器(实验)"接入 App.vue
- npm 包导出仍是老的,新设计器在 demo 站可用,npm 子路径发布留后续 PR

## 用法(demo 站)

```bash
npm run dev
# 打开 http://localhost:3000
# 点 "新设计器(实验)" tab
```

或在自己项目里直接用(待 npm 子路径发布):

```ts
import { PrintDesigner, useDesigner, printTemplate, createTemplate } from '@jake-gao/vue3-hiprint/designer'
```
