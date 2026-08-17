# vue3-hiprint API 文档

> 本文档基于 `src/hiprint/hiprint.bundle.js`（基于 hiprint 2.5.4）整理，详细描述 `vue3-hiprint` 暴露的核心 API。

---

## 1. 初始化与连接

### 1.1 `hiprint.init(options)`

```js
import { hiprint } from "@jake-gao/vue3-hiprint";

hiprint.init({
  host: "http://localhost:17521", // 桌面客户端地址
  token: "vue3-hiprint",          // 客户端设置的令牌
  lang: "cn",                      // ['cn','cn_tw','en','de','es','fr','it','ja','ru']
  providers: [new defaultElementTypeProvider()],
});
```

### 1.2 `hiwebSocket.setHost(host, token, callback)`

```js
hiwebSocket.setHost(
  "http://localhost:17521",
  "vue3-hiprint",
  (connect) => {
    if (connect) console.log("连接成功");
  }
);
```

### 1.3 连接中转服务器

```js
hiprint.init({
  host: "https://v5.printjs.cn:17521", // 中转服务器地址
  token: "vue3-hiprint-17521",         // 中转服务器令牌
});
```

---

## 2. Vue 3 插件

```js
import { hiPrintPlugin } from "@jake-gao/vue3-hiprint";

app.use(hiPrintPlugin, "$hiPrint", true);
```

`install(app, name, autoConnect)` 签名说明：
- `app`：Vue 3 应用实例（`createApp(...)` 返回值）
- `name`：注入的全局属性名，默认 `$hiPrint`
- `autoConnect`：是否自动连接 socket.io 客户端，默认 `true`

注册后组件内可访问：
- `this.$hiPrint` —— 等同于 `hiprint`
- `this.$print(provider, template, ...args)` —— 浏览器打印
- `this.$print2(provider, template, ...args)` —— 直接打印（需客户端）

---

## 3. 模板与打印

### 3.1 创建模板

```js
const tpl = new hiprint.PrintTemplate({
  template: {},                              // 模板 JSON
  settingContainer: "#PrintElementOptionSetting",  // 元素参数面板容器
  paginationContainer: ".hiprint-printPagination", // 多面板容器
  fontList: [{ title: "微软雅黑", value: "Microsoft YaHei" }],
  history: true,                             // 撤销/重做
  dataMode: 1,                               // 1: getJson, 其他: getJsonTid
  onImageChooseClick: (target) => { /* 图片选择回调 */ },
  onDataChanged: (type, json) => { /* 模板变更回调 */ },
  onUpdateError: (e) => { /* 更新失败回调 */ },
});
```

### 3.2 设计模式

```js
tpl.design("#hiprint-printTemplate", { grid: true });
```

### 3.3 浏览器打印

```js
tpl.print(data, {}, {
  styleHandler: () => "<style>.your-class { color: red }</style>",
  callback: () => console.log("打印窗口已打开"),
});
```

### 3.4 直接打印（socket.io）

```js
tpl.print2(printData, {
  printer: "打印机名称",
  title: "打印标题",
  client: "clientId",  // 中转服务时必填
});
tpl.on("printSuccess", () => console.log("打印完成"));
tpl.on("printError", () => console.log("打印失败"));
```

### 3.5 导出 PDF

```js
const blob = await tpl.toPdf(data, "test.pdf", { isDownload: true });
```

### 3.6 分批直接打印

```js
tpl.print2(printData, { printByFragments: true });
```

---

## 4. 元素 Provider

```js
import { hiprint, defaultElementTypeProvider } from "@jake-gao/vue3-hiprint";

hiprint.init({
  providers: [new defaultElementTypeProvider()],
});

// 自定义元素
hiprint.PrintElementTypeManager.buildByHtml($(".ep-draggable-item"));
```

默认可拖拽元素：文本、图片、长文、表格、空白表格、html、自定义文本、横线/竖线/矩形/椭圆、二维码、条形码等。

---

## 5. 事件

| 事件 | 触发时机 |
| --- | --- |
| `printSuccess` | 直接打印成功（来自客户端回调） |
| `printError` | 直接打印失败 |
| `printerList` | `getPrinterList()` 回调 |
| `clients` | `getClients()` 回调 |
| `clientInfo` | `getClientInfo()` 回调 |
| `ippPrinterCallback` | IPP 打印回调 |
| `ippPrinterConnected` | IPP 打印机连接 |

```js
tpl.on("printSuccess", (data) => console.log(data));
```

---

## 6. socket.io 连接管理

```js
import { autoConnect, disAutoConnect } from "@jake-gao/vue3-hiprint";

autoConnect((status, msg) => {
  if (status) console.log("已连接");
});

disAutoConnect();
```

或者通过 `window.hiwebSocket.hasIo() && window.hiwebSocket.start(cb)`。

---

## 7. 常见 API 速查

| API | 说明 |
| --- | --- |
| `hiprint.init(opts)` | 初始化 hiprint 单例与 socket 连接 |
| `hiprint.PrintElementTypeManager.buildByHtml($els)` | 从 DOM 构建拖拽元素 |
| `hiprint.PrintElementTypeManager.build(selector, module)` | 创建分组 HTML 并启用拖拽 |
| `hiprint.PrintElementTypeGroup(name, [elements])` | 元素分组 |
| `tpl.design(selector)` | 进入设计模式 |
| `tpl.print(data, opts, cb)` | 浏览器打印 |
| `tpl.print2(data, opts)` | 直接打印 |
| `tpl.toPdf(data, filename, opts)` | 导出 PDF |
| `tpl.getPrinterList()` | 获取打印机列表 |
| `tpl.on(event, cb)` | 监听事件 |
| `tpl.getJson()` / `tpl.update(json)` | 模板 JSON 读写 |

---

## 8. 配套组件

- **客户端**：[electron-hiprint](https://github.com/CcSimple/electron-hiprint/releases)（win/mac/linux）
- **中转服务**：[node-hiprint-transit](https://github.com/Xavier9896/node-hiprint-transit)

---

## 9. ⚖️ 许可证与依赖

- 本仓库代码 MIT 协议（见 `LICENSE`）。
- 核心引擎 `src/hiprint/hiprint.bundle.js` 基于 hiprint 2.5.4（LGPL），详见 `LICENSE-LGPL`。
- 任何修改 LGPL 文件后衍生的代码必须同样以 LGPL 发布。