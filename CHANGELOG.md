# CHANGELOG

## 1.0.14 (2026-11-27)

### 🐞 修复

- **模板加载的元素改坐标/宽高不生效**：右侧面板 `coordinate` / `widthHeight` 的门禁缓存了面板构建时的 `designTarget`，而 `getDesignTarget()` 在渲染中会重建该 DOM 节点，导致引用比对恒为假、`css()` 静默 `return null`。表现为**从模板 JSON 加载的元素改坐标/宽高不动（回车/失焦也不动），新拖入的元素正常**。改为实时取元素当前 `designTarget`，并按 DOM 节点比对。

### 📝 文档

- README 新增"不要把 `PrintTemplate` 放进 `ref()` / `reactive()`"说明：Vue proxy 会破坏 hiprint 内部的引用相等判断（用 `markRaw` / `shallowRef`）。

### ⚠️ 使用建议

- 即使本版已对代理免疫，消费方仍建议用 `markRaw()` / `shallowRef()` 持有 `PrintTemplate` 实例，避免无谓的深层代理开销。

## 1.0.0 (2026-XX-XX)

### ⚠️ 破坏性升级（fork 自 CcSimple/vue-plugin-hiprint）

首个以 **@jake-gao/vue3-hiprint** 发布的版本。基于 [CcSimple/vue-plugin-hiprint](https://github.com/CcSimple/vue-plugin-hiprint) 历史版本进行二次开发。

**主要变更**：
- 仅支持 Vue 3 + antd-vue 2.x
- 移除 Vue 2 / antd-vue 1.x 兼容代码
- 迁移到 Vite 5（彻底移除 webpack / vue-cli-service）
- Node 引擎升级到 ≥ 18
- `hiPrintPlugin.install` 签名：`install(Vue, ...)` → `install(app, ...)`（Vue 3 `App` 实例）
- `this.$error` 不再可用，改用 `Modal.error({title, content})`
- `<a-icon>` 组件已删除，使用 `@ant-design/icons-vue` 具名组件
- 新增 `vue3-hiprint` 全局变量名（替代 `vue-plugin-hiprint`）

**重要约束**：
- 本仓库基于 LGPL 协议依赖 hiprint 2.5.4，详见 `LICENSE-LGPL`
- 老用户请继续使用上游版本 `vue-plugin-hiprint@0.0.61-beta5`