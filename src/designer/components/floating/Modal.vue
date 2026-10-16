<template>
  <Teleport to="body">
    <div v-if="open" class="ant-modal-wrap" @click.self="onCancel">
      <div class="ant-modal" role="dialog" aria-modal="true">
        <div class="ant-modal-content">
          <div class="ant-modal-header">
            <div class="ant-modal-title">{{ title }}</div>
          </div>
          <div class="ant-modal-body">
            <slot>
              <template v-if="typeof content === 'string'">{{ content }}</template>
            </slot>
          </div>
          <div class="ant-modal-footer">
            <button
              v-if="showCancel"
              class="ant-btn ant-btn-default"
              type="button"
              @click="onCancel"
            >{{ cancelText }}</button>
            <button
              class="ant-btn ant-btn-primary"
              :class="{ 'ant-btn-dangerous': danger }"
              type="button"
              @click="onConfirm"
            >{{ confirmText }}</button>
          </div>
          <button
            class="ant-modal-close"
            type="button"
            aria-label="关闭"
            @click="onCancel"
          >
            <span class="ant-modal-close-x" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 通用 Modal 弹窗(替换 window.confirm/alert 的设计器内置版本)。
 *
 * 参照 antd `a-modal` 风格,结构层次:wrap → modal → content → {header, body, footer, close}。
 *
 * 用法:
 *   <Modal
 *     v-model:open="modal.open"
 *     title="删除页"
 *     content="确定删除第 X 页?"
 *     confirm-text="删除"
 *     cancel-text="取消"
 *     danger
 *     @confirm="onConfirm"
 *     @cancel="onCancel"
 *   />
 */
defineProps<{
  open: boolean;
  title?: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  /** 隐藏取消按钮(只显示确认,等价于 window.alert) */
  showCancel?: boolean;
  /** 确认按钮 danger 样式(红色,删除类操作) */
  danger?: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
  cancel: [];
}>();

function onConfirm() {
  emit("confirm");
  emit("update:open", false);
}
function onCancel() {
  emit("cancel");
  emit("update:open", false);
}
</script>

<style scoped>
/* 遮罩:全屏 fixed,flex 居中内部 modal */
.ant-modal-wrap {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}
/* modal 自身:固定宽 520,max-width 保留视口边距;position: relative 防止外部 fixed 全屏 CSS 干扰 */
.ant-modal {
  position: relative;
  width: 520px;
  max-width: calc(100vw - 32px);
  top: 0;
  left: 0;
  right: auto;
  bottom: auto;
  pointer-events: auto;
}
/* 内容盒子:白底圆角阴影 */
.ant-modal-content {
  position: relative;
  background-color: #fff;
  background-clip: padding-box;
  border: 0;
  border-radius: 4px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
}
.ant-modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 4px 4px 0 0;
}
.ant-modal-title {
  margin: 0;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 600;
  font-size: 16px;
  line-height: 1.5;
}
.ant-modal-body {
  padding: 20px 24px;
  font-size: 14px;
  line-height: 1.5714;
  color: rgba(0, 0, 0, 0.88);
  word-wrap: break-word;
}
.ant-modal-footer {
  padding: 12px 16px;
  text-align: right;
  border-top: 1px solid #f0f0f0;
  border-radius: 0 0 4px 4px;
}
.ant-modal-footer .ant-btn {
  margin-left: 8px;
}
.ant-modal-close {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  padding: 0;
  width: 56px;
  height: 56px;
  color: rgba(0, 0, 0, 0.45);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: color 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ant-modal-close:hover {
  color: rgba(0, 0, 0, 0.88);
}
.ant-modal-close-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* 按钮:antd 默认 + 主按钮 + 危险变体 */
.ant-btn {
  display: inline-block;
  outline: 0;
  border: 1px solid transparent;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding: 4px 15px;
  font-size: 14px;
  line-height: 1.5714;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  user-select: none;
}
.ant-btn-default {
  background: #fff;
  border-color: #d9d9d9;
  color: rgba(0, 0, 0, 0.88);
}
.ant-btn-default:hover {
  color: #4096ff;
  border-color: #4096ff;
}
.ant-btn-primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}
.ant-btn-primary:hover {
  background: #4096ff;
  border-color: #4096ff;
  color: #fff;
}
.ant-btn-dangerous {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: #fff;
}
.ant-btn-dangerous:hover {
  background: #ff7875;
  border-color: #ff7875;
  color: #fff;
}
</style>
