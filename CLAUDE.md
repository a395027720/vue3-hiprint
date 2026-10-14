# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目本质

`vue3-hiprint` 是一个 **JavaScript 工具库**（不是 Vue 组件库），基于 [hiprint 2.5.4](http://hiprint.io/)（LGPL）二次开发，提供 Web 端可视化打印设计器（拖拽/分页/表头表脚/样式/撤销重做）、模板 JSON 导出、浏览器静默打印（借助 `electron-hiprint` 客户端）。

主分支（main）是 **融合版本**：仓库同时包含 npm 包源代码（被打包成 `dist/vue3-hiprint.js`）和 demo 站点（被打包成 `demo/`，部署到 GitHub Pages）。

本项目 fork 自 [CcSimple/vue-plugin-hiprint](https://github.com/CcSimple/vue-plugin-hiprint)，迁移到 Vue 3 + antd-vue 2 + Vite 5。

## 双产物双打包（Vite 5）

| 产物 | 配置 | 命令 | 输出目录 | 用途 |
| --- | --- | --- | --- | --- |
| npm 包 | `vite.config.lib.js`（lib 模式 UMD） | `npm run build-lib` | `dist/` | 发布到 npm（`@jake-gao/vue3-hiprint`） |
| demo 站点 | `vite.config.app.js`（应用模式） | `npm run build-demo` | `demo/` | 部署到 GitHub Pages |

- `src/index.js` 是 npm 包入口，被 `vite.config.lib.js` 打成 UMD（`library: 'vue3-hiprint'`）。
- `src/main.js` 是 demo 入口，被 `vite.config.app.js` 通过 `App.vue` 加载。
- 9 个运行时 UMD 库（jquery / jsbarcode / bwip-js / socket.io-client / jspdf / canvg / html2canvas / nzh / @claviska/jquery-minicolors）在 `vite.config.lib.js` 的 `external` 中按全局变量名声明；npm 包不打包，使用方需在 HTML 中通过 `<script>` 引入。

## 命令速查

```bash
# 开发调试 demo
npm run dev                  # 启动 demo 开发服务器（vite）

# 构建
npm run build-demo           # 构建 demo 站点（输出到 ./demo/）
npm run build-lib            # 构建 npm 包（输出到 ./dist/，UMD）

# 发布（需先登录 npm registry）
npm run pub                  # npm publish（默认 tag）
npm run pub-beta             # npm publish --tag beta

# 版本号自增（依赖 git，详见 scripts/change-version.js）
npm run up-version           # 升 beta（递增 x.y.z-beta{N}），并自动 commit + tag
npm run up-version newVersion  # 升正式版（递增末位），自动 commit + tag
```

> **注意**：`engines.node >= 18`（CI 也用 `node-version: 18`）。仓库内 **没有单元测试框架**（无 jest/vitest），修改后请用 `npm run dev` 人工验证 demo 页面。

## 核心源码地图

```
src/
├── index.js                       # ★ npm 包入口，导出 hiprint/autoConnect/disAutoConnect/hiPrintPlugin/defaultElementTypeProvider
├── main.js                        # demo 应用入口（createApp + 注册 hiPrintPlugin、ant-design-vue、vue-ls）
├── App.vue                        # demo 顶部导航 + 动态组件切换（5 个 demo）
│
├── hiprint/
│   ├── hiprint.bundle.js          # ★ 核心引擎单文件（约 559KB），所有 PrintTemplate/PrintElement/PrintPanel 类都在这里（LGPL 文件，不要改头部声明）
│   ├── hiprint.config.js          # 全局默认配置（吸附距离、坐标显示、纸张模式），挂到 window.HIPRINT_CONFIG
│   ├── etypes/default-etyps-provider.js  # ★ 默认可拖拽元素 provider（文本/图片/长文/表格/二维码/条形码等）
│   ├── plugins/
│   │   ├── jquery.hiwprint.js     # 浏览器打印 iframe 注入
│   │   ├── qrcode.js              # 二维码渲染（LGPL）
│   │   └── watermark.js           # 水印（LGPL）
│   └── css/
│       ├── hiprint.css            # 设计器 UI 样式
│       └── print-lock.css         # ★ 必须由使用方在 index.html 用 media="print" 引用
│
├── demo/                          # 五个示例页面
│   ├── design/                    # 默认拖拽设计
│   ├── custom/                    # 自定义 provider/elements 示例
│   ├── tasks/                     # 队列/批量打印
│   ├── panels/                    # 多面板/分页
│   ├── templates/                 # 模板中心
│   └── json-view.vue              # JSON 查看器组件
│
├── utils/index.js                 # decodeVer() 解析版本号字符串
└── i18n/                          # 9 种语言：cn、cn_tw、en、de、es、fr、it、ja、ru

## 新设计器（实验）`src/designer/`

Vue 3 + TypeScript 重写的可视化设计器，**实验性**，与 `src/hiprint/` 旧版并存。入口 `#/designer`（hash 路由切换），主要文件在 `src/demo/new-designer/`。

```
src/designer/
├── index.ts                       # 模块入口（导出 PrintDesigner / useDesigner / types）
├── api/useDesigner.ts             # ★ 单一 Composition API 入口（模板/选中/增删改/历史/缩放/网格/多选）
├── core/
│   ├── types.ts                   # Paper / Element 联合类型（含 rotate / locked）
│   ├── schema.ts                  # 不可变 helper（createElement / addElement / updateElement / removeElement）
│   ├── id.ts                      # nextId()
│   ├── history.ts                 # 简单 undo/redo（past/future 栈）
│   ├── render.ts                  # mmToPx（96/25.4）、renderTemplate
│   └── align.ts                   # alignHorizontal / alignVertical
├── components/
│   ├── PrintDesigner.vue          # ★ 顶层壳：TopBar + FormatToolbar + DesignerCanvas + PropertyPanel
│   ├── DesignerCanvas.vue         # ★ 画布：ruler / 元素 / 框选 / 延长线 / 旋转 / 锁定 / 右键菜单
│   ├── ElementRenderer.vue        # 单元素渲染（按 type 分发）
│   ├── PropertyPanel.vue          # 右侧属性面板
│   ├── ContextMenu.vue            # 右键菜单
│   ├── TopBar.vue / FormatToolbar.vue
├── utils/
│   ├── print.ts                   # printTemplate / previewTemplate
│   ├── pdf.ts                     # exportPdf
│   └── snap.ts                    # snapValue() 吸附候选匹配
└── StandaloneDesigner.vue         # hash=#/designer 时的独立壳（无 demo 顶栏）
```

### 核心交互

| 能力 | 行为 |
| --- | --- |
| **框选** | 画布空白 mousedown 启动,虚线选区带 W×H mm 尺寸标签,实时高亮命中元素(锁定元素除外),mouseup 选中所有与选区相交的元素 |
| **多选** | `multiSelectedIds: string[]`(主选 `selectedId` 单独存),Shift+点 toggle,组拖动时一起平移(主选做吸附,其它跟随) |
| **组拖动** | 点中元素在 multi 集合里时,所有选中元素按主选位移(保持相对位置);吸附候选只对组外元素 + 画布边界 |
| **拖动延长线** | 拖动时从元素/组 4 边各画 1 条贯穿画布到 ruler 的浅蓝虚线,选中状态不显示 |
| **吸附辅助线** | 拖动时元素/组 4 边跟其它元素/画布边界重合,红实线高亮指示对齐 |
| **标尺** | 高端 SVG 标尺,刻度密度随 zoom 自适应,0 位加粗,鼠标在画布上时有红游标 + mm 数 chip,选中元素 4 边在标尺上有蓝色三角标记 |
| **旋转** | 选中元素顶边中点上方有旋转手柄,反向旋转保持图标正向,实时显示度数 |
| **锁定** | 锁定元素不参与框选、不允许拖动/resize/旋转,边框金黄 + 🔒 徽标,右键菜单可解锁 |
| **吸附** | 4 条边(left/right/top/bottom)+ 4 个画布边界(0/paper.w/h),阈值 1mm,Shift 角 handle 等比 |
| **键盘** | Space 临时 pan,Delete 删多选,Esc 清多选,方向键在 FormatToolbar 实现 |
| **撤销/重做** | `add/remove/moveUp/moveDown/bringToFront/sendToBack/copy/cut/paste/setLocked/clearElements/setPaper/load` 入 history;`update` 不入(拖动连续触发,粒度太细) |

### 关键坐标体系

- **所有坐标/尺寸都是 mm**,打印纸张一致(避免 px/pt 转换)
- `mmToPx(mm) = mm * 96/25.4 ≈ 3.78px`(96 DPI 屏幕换算)
- **画布 + 标尺的 frame 绝对像素坐标系**:`canvas left:24, top:24` 在 `.canvas-frame` 内(给 24px ruler 让位);ruler svg 用 viewBox 1:1 对齐 canvas 1px
- **元素** `.canvas-element` 在 `.canvas` 内,`left: mmToPxScaled(e.x)px`
- **延长线 / 吸附线 / 三角标记** 都在 `.canvas-frame` 级,`left: 24 + mmToPxScaled(m)px`,跟元素 left 算法完全一致(像素级对齐,不依赖 viewBox 缩放系数)
- **标尺内 svg 元素**(刻度/文字/鼠标游标)用 viewBox 坐标 = `mmToPxScaled(m)`,**禁止** 加 +24(viewBox 0 = svg 0 = frame 24 = canvas 0mm,1:1 缩放)

### 关键 z-index

- `self-line`(延长虚线)`: 2`
- `snap-line`(吸附红线)`: 4`
- `.ruler`(标尺)`: 5`
- `.mark-tri`(选中元素位置三角)`: 6`

### 关键全局对象

- `hiprint`：核心命名空间（导出自 `hiprint.bundle.js`），含 `PrintTemplate`、`PrintElementTypeManager`、`init({ host, token, lang, providers })`。
- `window.hiprint` / `window.vue3Hiprint`：浏览器全局变量名（两者都暴露，方便兼容老版本 `vue-plugin-hiprint`）。
- `hiwebSocket`（`window.hiwebSocket`）：socket.io 客户端封装，对接 `electron-hiprint` 客户端或 `node-hiprint-transit` 中转服务。
- `defaultElementTypeProvider`：默认拖拽元素 provider，用户通过 `new defaultElementTypeProvider()` 实例化后传入 `hiprint.init({ providers: [...] })`。
- `hiPrintPlugin`：Vue 3 插件对象，`app.use(hiPrintPlugin, '$hiPrint', autoConnect)` 后注入 `this.$hiPrint`、`this.$print`、`this.$print2`。

## 构建系统关键配置

- `vite.config.app.js` + `vite.config.lib.js`：两个独立 Vite 配置，通过 npm scripts 显式 `--config` 切换。
- `vite-plugins/require-context-shim.js`：Vite 插件，在 transform 阶段把 `hiprint.bundle.js:68` 的 `require.context('../i18n', ...)` 替换为静态 import。**这是 webpack-only API 的兼容层**，让 bundle.js 主体代码保持不动。
- `resolve.alias`：
  - `'nzh/dist/nzh.min.js' → 'nzh'`（nzh 包未在 exports 暴露子路径）
  - `'concurrent-tasks' → 'concurrent-tasks/lib/index.js'`（绕开 v1.0.7 ESM 入口的 bug）
- `cacheDir: '.vite-cache'`：当 `node_modules` 是 root-owned 时，避免 EACCES。

## 关键约束与陷阱

1. **`print-lock.css` 必须由使用方引入**：源文件在 `dist/print-lock.css`，消费项目必须在 `index.html` 中用 `<link rel="stylesheet" media="print" href="/print-lock.css">` 引入。npm 包**不会自动注入**。
2. **socket.io 4.x 兼容性**：本仓库 `socket.io-client@4.5.1` 已升 4.x，与 hiprint 官网提供的旧版客户端**不兼容**。直接打印必须配套 [`electron-hiprint`](https://github.com/CcSimple/electron-hiprint/releases) 客户端。
3. **跨域连接客户端**：部署到线上若连接客户端失败，根因通常是**浏览器 Mixed Content**，需给站点升级 HTTPS。
4. **`hiprint.bundle.js` 是 LGPL 核心引擎**：所有打印逻辑都在这一个大文件里。定位问题时先在这里 grep。**不要修改头部 LGPL 声明、作者信息、`token: 'vue-plugin-hiprint'` 默认值**——违反 LGPL 协议。
5. **不要新增 npm 包代码到 demo**：demo 页面（`src/demo/**`）会与 npm 包一起发布，混在一起会让用户既装了包又跑了 demo。
6. **LGPL 协议**：本项目基于 hiprint 2.5.4（LGPL），修改 `src/hiprint/hiprint.bundle.js` 中的 LGPL 部分后，涉及的衍生代码必须遵循 LGPL（详见 `LICENSE-LGPL`）。
7. **Vue 3 + antd-vue 2**：所有 demo 用 antd-vue 2.x（已删除 `<a-icon>`，需用 `@ant-design/icons-vue` 具名组件）；`this.$error` 已删除，改用 `Modal.error`。

## CI/CD

- `.github/workflows/deploy-demo.yml`：tag 匹配 `0.*` 或 `1.*` 时触发 → `npm run up-version newVersion` 升正式版 → `npm run pub`。
- `.github/workflows/deploy-demo-beta.yml`：push 到 `main` 分支触发，先用 `technote-space/get-diff-action` 判断 `src/hiprint/**`、`src/demo/**`、`public/**` 是否有变更：
  - 改了 `src/hiprint/**` → `npm run up-version` 升 beta → `npm run pub-beta`。
  - 改了 `src/demo/**` 或 `public/**` → 跳过发包，仅 `npm run build-demo` 后部署到 gh-pages。

## 国际化

通过 `hiprint.init({ lang: 'en' })` 切换，支持 `cn`（默认）、`cn_tw`、`en`、`de`、`es`、`fr`、`it`、`ja`、`ru`。新增语言时在 `src/i18n/` 加 JSON，并在 `hiprint.config.js` 中注册。

## 调试小技巧

```javascript
// 在浏览器控制台手动显示/隐藏打印 iframe，方便调试
$("#app").css("display", "none");
$("#hiwprint_iframe").css({ visibility: "visible", width: "100%", height: "251.09mm" });
// 反过来隐藏 iframe、显示 vue 页面
```