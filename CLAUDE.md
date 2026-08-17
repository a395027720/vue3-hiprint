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
```

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