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

`useHiprint` 一站式 composable，收敛 init / providers / 模板 / 打印 / clear / guard 六个职责,单一 hook 入口,无 template ref 暴露 markRaw 后的 PrintTemplate 实例。

### 完整接入示例（`<script setup>`）

```vue
<script setup>
import { onMounted } from "vue";
import { Modal, message } from "ant-design-vue";
import {
  useHiprint,
  defaultElementTypeProvider,
} from "@jake-gao/vue3-hiprint";

const printData = { name: "张三", amount: 100 };

const {
  template, build, rebuild,
  print, print2, toPdf,
  clear, guard, printing,
  initProviders,
} = useHiprint({
  // === 必填/常用 ===
  template: {},                                // 模板 JSON（空对象 = 新建空白模板）
  providers: [new defaultElementTypeProvider()],
  moduleName: "defaultModule",

  // === 可选：容器/DOM 选择器,默认值就是下面这些 ===
  // elementContainer: ".hiprintEpContainer",   // 左侧拖拽元素容器
  // designContainer: "#hiprint-printTemplate", // 中间画布
  // settingContainer: "#PrintElementOptionSetting",
  // paginationContainer: ".hiprint-printPagination",

  // === 可选：透传给 PrintTemplate 构造函数 ===
  // templateOptions: {
  //   history: true,    // 启用撤销/重做
  //   dataMode: 1,      // 1=按 tid,2=按 id
  //   onDataChanged: (type, json) => console.log(type, json),
  // },

  // === 可选：透传给 .design() 第二参 ===
  // designOptions: { grid: true },

  // === 可选：UI 注入(不绑任何 UI 库)===
  onGuardFail: () => Modal.error({
    title: "客户端未连接",
    content: "请先下载并运行 electron-hiprint 打印服务。",
    okText: "我知道了",
  }),
});

onMounted(() => build());  // 也可 autoBuild: true 省掉这一步

function handlePreview()  { print(printData); }                // 浏览器打印
function handlePrint2()   { print2(printData, { title: "订单打印" }); }  // title 在调用时传
function handleToPdf()    { toPdf(printData, "订单.pdf"); }
function handleClear()    { clear(); }
</script>

<template>
  <a-button :loading="printing" @click="handlePreview">预览</a-button>
  <a-button @click="handlePrint2">直接打印</a-button>
  <a-button @click="handleToPdf">导出 PDF</a-button>
  <a-popconfirm title="确定清空?" @confirm="handleClear">
    <a-button danger>清空</a-button>
  </a-popconfirm>

  <div id="hiprint-printTemplate" />
  <!-- template ref 也可传给第三方组件,例如 PaperToolbar / 自定义属性面板 -->
</template>
```

### 返回的 API

| API | 用途 |
|---|---|
| `template` | 模板实例 ref（`markRaw` 后,直接传给 `PaperToolbar` 等子组件） |
| `build(tpl?)` / `rebuild(tpl?)` | 建模板 + design 渲染到画布 |
| `print(data, opts?)` | 浏览器打印（弹系统打印预览），自动管 `printing` loading |
| `print2(data, opts?)` | 客户端直接打印（socket.io），内置 guard 检查 |
| `toPdf(data, name?, opts?)` | 导出 PDF |
| `clear()` | 清空画布（统一 try/catch + `message.error` 兜底） |
| `guard.run(op, opts?)` | 客户端连接守卫，失败时调 `onGuardFail` |
| `printing` | 打印 loading 态 ref（true=打印中） |
| `initProviders({providers?, moduleName?})` | 重新注册 providers（模式切换场景） |

### `print2` 的 guard 机制

`print2` 走的是客户端 socket 直连,需要先连 electron-hiprint。`useHiprint` 内置 guard:

```js
// 自动守卫模式（推荐）
print2(data, { title: "订单打印" });  // 未连接时自动调 onGuardFail,无 throw

// 自定义提示
print2(data, {
  title: "订单打印",
  onFail: () => message.warning("客户端掉线了"),  // 临时覆盖 onGuardFail
});

// 拿到 guard 自行判断
const ok = guard.run(() => print2(data, { title: "..." }));
if (ok) message.success("已发送");
```

### Options API 接入

`useHiprint` 也支持 Options API,通过 `setup()` 暴露需要的部分：

```js
import { Modal } from "ant-design-vue";
import { useHiprint, defaultElementTypeProvider } from "@jake-gao/vue3-hiprint";

export default {
  setup() {
    const { template, build, print, print2, clear, guard } = useHiprint({
      providers: [new defaultElementTypeProvider()],
      onGuardFail: () => Modal.error({
        title: "客户端未连接",
        content: "请先下载并运行 electron-hiprint 打印服务。",
      }),
    });
    return { template, build, print, print2, clear, guard };
  },
  mounted() {
    this.build();
  },
  methods: {
    handlePrint2() { this.print2({ name: "张三" }, { title: "订单打印" }); },
    handleClear() { this.clear(); },
  },
};
```

如果只想拿最朴素的 PrintTemplate 实例（不用 hook 管生命周期），还有顶层函数 `createPrintTemplate(opts)`：

```js
import { createPrintTemplate } from "@jake-gao/vue3-hiprint";

const tpl = createPrintTemplate({ template: {}, history: true });
tpl.design("#hiprint-printTemplate");
tpl.print({ name: "张三" });
```

### 跟传统 `this.$print` / `this.$print2` 对比

| 维度 | 老 `this.$print(provider, tpl, data)` | 新 `useHiprint()` |
|---|---|---|
| 范式 | 命令式,每次都新建 template | hook 式,生命周期由组件管理 |
| 模板复用 | 每次销毁重建 | `build(tpl?)` 复用,可在 onMounted 一次性建 |
| 守卫 | 无 | 内置 `guard.run` + `onGuardFail` 注入 |
| 撤销/重做 | 需自己接 history 字段 | `templateOptions.history: true` 一行开启 |
| 加载态 | 无 | `printing` ref 自动管 |
| Providers 切换 | 需手动 `hiprint.init` | `initProviders({ providers, moduleName })` |
| 适配 Vue 3 | 用 `hiPrintPlugin.install` 注入 | 直接 `import` |

### `onGuardFail` 设计

`useHiprint` **不绑任何 UI 库**。客户端未连接时,你想用 Element Plus / Naive UI / 自己写 toast 都行：

```js
// 方式 1：全局配置一次
useHiprint({ onGuardFail: () => ElementPlus.ElMessage.error("未连接") });

// 方式 2：antd
useHiprint({ onGuardFail: () => Modal.error({ title: "未连接" }) });

// 方式 3：自定义 toast
useHiprint({ onGuardFail: () => myToast("客户端掉线") });

// 方式 4：什么都不做（静默）
useHiprint({ onGuardFail: null });
```

### 模式切换（多 provider）

如果你的应用需要在不同业务下切换拖拽元素,例如"电商模板"和"票据模板"用不同的 etypes：

```js
import { useHiprint, defaultElementTypeProvider } from "@jake-gao/vue3-hiprint";
import EcommerceProvider from "./providers/ecommerce";
import ReceiptProvider from "./providers/receipt";

const { initProviders, build } = useHiprint({
  providers: [new defaultElementTypeProvider()],
});

function switchTo(mode) {
  if (mode === "ecommerce") {
    initProviders({
      providers: [new EcommerceProvider()],
      moduleName: "ecommerceModule",
    });
  } else {
    initProviders({
      providers: [new ReceiptProvider()],
      moduleName: "receiptModule",
    });
  }
  build();  // 重建画布
}
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