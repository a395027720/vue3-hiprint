# @jake-gao/vue3-hiprint

> 基于 hiprint 的 Vue 3 + ant-design-vue 2 可视化打印设计器。

支持拖拽分页、表头表脚、样式设置、撤销重做、模板导出、静默打印（需配套客户端）。

---

## 安装

```bash
npm install @jake-gao/vue3-hiprint
```

```bash
# 配套的 UMD 依赖（按需 CDN 引入）
# jquery / socket.io-client / jsbarcode / bwip-js / nzh / canvg / jspdf / html2canvas / jquery-minicolors
```

在 `index.html` 中通过 `<script>` 注入运行时 UMD 库（详见 `index.html`）。

---

## 快速使用

```js
import { hiprint, defaultElementTypeProvider } from "@jake-gao/vue3-hiprint";

hiprint.init({
  providers: [new defaultElementTypeProvider()],
});

const tpl = new hiprint.PrintTemplate({
  template: {},
  settingContainer: "#PrintElementOptionSetting",
  paginationContainer: ".hiprint-printPagination",
  history: true,
});

tpl.design("#hiprint-printTemplate");
tpl.print({ /* data */ });
```

---

## Vue 3 全局插件

```js
import { hiPrintPlugin } from "@jake-gao/vue3-hiprint";

app.use(hiPrintPlugin, "$hiPrint");

// 之后可在组件中使用：
this.$hiPrint.PrintTemplate({...}).print(data);
this.$print(provider, template, data);
this.$print2(provider, template, data);
```

---

## 开发

```bash
npm install
npm run dev          # 启动 demo 开发服务器
npm run build-lib    # 打包 npm 包（输出到 dist/）
npm run build-demo   # 打包 demo 站点（输出到 demo/）
```

---

## ⚖️ 许可证与依赖说明

- 本仓库代码以 **MIT** 协议发布（见 `LICENSE`）。
- 本仓库包含 `src/hiprint/hiprint.bundle.js`，该文件是 [hiprint 2.5.4](http://hiprint.io/) 的修改版本（LGPL 协议）。**根据 LGPL 条款，修改和衍生部分必须以 LGPL 重新发布**，详见 `LICENSE-LGPL`。
- 本项目 fork 自 [CcSimple/vue-plugin-hiprint](https://github.com/CcSimple/vue-plugin-hiprint)，并在其基础上迁移到 Vue 3 + Vite 5 + antd-vue 2。