# CHANGELOG

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