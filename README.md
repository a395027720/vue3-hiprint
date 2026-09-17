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

## Vue 3 Wrapper API（推荐）

`useHiprint` 一站式 composable，收敛 init / providers / 模板 / 打印 / clear / guard。

```vue
<script setup>
import { Modal } from "ant-design-vue";
import { useHiprint, defaultElementTypeProvider } from "@jake-gao/vue3-hiprint";

const {
  template, build, rebuild,
  print, print2, toPdf,
  clear, guard, printing,
  initProviders,
} = useHiprint({
  template: {},
  providers: [new defaultElementTypeProvider()],
  moduleName: "defaultModule",
  onGuardFail: () => Modal.error({
    title: "客户端未连接",
    content: "请先下载并运行 electron-hiprint 打印服务。",
    okText: "我知道了",
  }),
});

onMounted(() => build());

function handlePrint2() {
  print2(printData, { title: "订单打印" });  // title 是 print2 调用时参数,非实例配置
}
function handleClear() { clear(); }
</script>

<template>
  <div id="hiprint-printTemplate" />
</template>
```

返回的 API 一览：

| API | 用途 |
|---|---|
| `template` | 模板实例 ref（`markRaw` 后,直接传给 `PaperToolbar` 等组件） |
| `build(tpl?)` / `rebuild(tpl?)` | 建模板 + design |
| `print(data, opts?)` | 浏览器打印（弹系统打印预览），自动管 loading |
| `print2(data, opts?)` | 客户端直接打印（socket.io），内置 guard |
| `toPdf(data, name?, opts?)` | 导出 PDF |
| `clear()` | 清空画布（try/catch + `message.error`） |
| `guard.run(op, opts?)` | 客户端连接守卫，失败时调 `onGuardFail` |
| `printing` | 打印 loading 态 ref |
| `initProviders({providers?, moduleName?})` | 重新注册 providers（模式切换场景） |

**`onGuardFail` 是唯一需要 demo 注入的 UI 回调**——`useHiprint` 不绑任何 UI 库，你想用 Element Plus / Naive UI / 自己写 toast 都行。

Options API demo 用 `setup()` 暴露需要的部分：

```js
setup() {
  const { guard, clear } = useHiprint({ onGuardFail: () => Modal.error({...}) });
  return { guard, clear };
}
```

Options API 还提供 `createPrintTemplate(opts)` 顶层函数,不走 ref（详见 bundle.js）。

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