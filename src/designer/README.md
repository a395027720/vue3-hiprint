# src/designer — 现代化打印设计器

与 `src/hiprint/`(LGPL 引擎)并列的新实现,目标:用现代技术栈重做一个**易用、易集成、可演进**的打印设计器。

## 设计原则

1. **核心层零依赖**: `core/` 不引用 Vue、不引用 DOM、不引用 jQuery。可独立单元测试、可在 Node 跑。
2. **不可变数据**: Template 是个普通对象,所有更新走 `updateElement(template, id, patch)` 模式,返回新 Template。
3. **类型驱动**: 全部用 TypeScript 写,Element 是判别联合(discriminated union),`type` 字段区分。
4. **细节需求一等公民**: `TableElement.pageBreakBefore`(另起一页)/ `TableElement.rowBreak`(行内不跨页)/ `TableElement.repeatHeader`(跨页重复表头)都是 schema 字段,不是埋在 eval 字符串里的代码。
5. **不绑 UI 库**: `PropertyPanel` 用原生 Vue + input,需要 antd / Element Plus 各自包一层。

## 目录

```
designer/
├── core/                ← 纯函数核心,无 DOM
│   ├── types.ts         ← Element / Template / Paper 等类型定义
│   ├── schema.ts        ← updateElement 等 immutable helper
│   ├── id.ts            ← uuid v4 helper
│   └── render.ts        ← template + data → HTML 渲染
├── api/
│   └── useDesigner.ts   ← Composition API 入口
├── components/
│   ├── PrintDesigner.vue        ← 主组件(三栏布局)
│   ├── ElementPalette.vue       ← 左侧可拖拽元素列表
│   ├── DesignerCanvas.vue       ← 中间画布
│   ├── PropertyPanel.vue        ← 右侧属性面板
│   └── ElementRenderer.vue      ← 画布上单个元素的渲染
├── utils/
│   └── print.ts         ← iframe 打印入口
└── index.ts             ← 模块入口
```

## 与老 `src/hiprint/` 的关系

- 老代码保留(LGPL + 向后兼容)
- 默认 npm 导出仍是老的,新设计器通过 `@jake-gao/vue3-hiprint/designer` 子路径访问
- 不破坏任何现有用户

## 范围

本目录目前是 **MVP**: 4 种元素(text/image/table/line),拖拽 + 选中 + 移动 + resize,iframe 打印,JSON 导入导出。
不做: 表达式引擎、跨页表头、表格合并、PDF 导出、撤销重做(后续 PR)。
