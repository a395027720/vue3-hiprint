<!--
  CodeEditorModal — JSON textarea 编辑器(S5)。

  复用 floating/Modal.vue 的样式 token。
  校验:JSON.parse 失败 / 非 object / allowedKeys 严格匹配 → 红字提示 + 禁用确认按钮。
  Teleport 目标走 inject('modal-container') || 'body'。
-->
<template>
  <Teleport :to="teleportTarget">
    <div v-if="visible" class="ant-modal-wrap" @click.self="onCancel">
      <div class="ant-modal" role="dialog" aria-modal="true">
        <div class="ant-modal-content">
          <div class="ant-modal-header">
            <div class="ant-modal-title">{{ title }}</div>
          </div>
          <div class="ant-modal-body">
            <textarea
              v-model="draft"
              class="code-json"
              spellcheck="false"
              @keydown.esc="onCancel"
            />
            <div v-if="error" class="code-error">{{ error }}</div>
            <div v-else-if="allowedKeys && allowedKeys.length" class="code-hint">
              允许的键:{{ allowedKeys.join(", ") }}
            </div>
          </div>
          <div class="ant-modal-footer">
            <button class="ant-btn ant-btn-default" type="button" @click="onCancel">取消</button>
            <button
              class="ant-btn ant-btn-primary"
              type="button"
              :disabled="!!error"
              @click="onConfirm"
            >保存</button>
          </div>
          <button class="ant-modal-close" type="button" aria-label="关闭" @click="onCancel">
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
import { computed, inject, ref, watch, type Ref } from "vue";

const modalContainer = inject<Ref<HTMLElement | null>>("modal-container", ref(null));
const teleportTarget = computed(() => modalContainer.value ?? "body");

const props = defineProps<{
  visible: boolean;
  title?: string;
  value: string;
  /** 严格白名单:解析后顶层 keys 必须 === allowedKeys(顺序无关) */
  allowedKeys?: string[];
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  /** 校验通过时 emit 解析后的对象 */
  save: [parsed: unknown];
}>();

const draft = ref("");

watch(
  () => props.visible,
  (s) => {
    if (s) draft.value = props.value ?? "{}";
  },
  { immediate: true },
);

/** 实时校验;非空字符串表示有错误 */
const error = computed<string>(() => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(draft.value || "{}");
  } catch (e) {
    return `JSON 解析失败: ${(e as Error).message}`;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return "必须是 JSON 对象";
  }
  if (props.allowedKeys && props.allowedKeys.length > 0) {
    const keys = Object.keys(parsed).sort();
    const allow = [...props.allowedKeys].sort();
    if (keys.length !== allow.length || keys.some((k, i) => k !== allow[i])) {
      return `键必须为: ${allow.join(", ")}`;
    }
  }
  return "";
});

function onConfirm() {
  if (error.value) return;
  emit("save", JSON.parse(draft.value || "{}"));
  emit("update:visible", false);
}

function onCancel() {
  emit("update:visible", false);
}
</script>

<style scoped>
/* 复用 .ant-modal-* / .ant-btn-* token */
.ant-modal-wrap {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ant-modal {
  position: relative;
  width: 640px;
  max-width: calc(100vw - 32px);
  pointer-events: auto;
}
.ant-modal-content {
  position: relative;
  background-color: #fff;
  background-clip: padding-box;
  border: 0;
  border-radius: 4px;
  box-shadow:
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
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
.ant-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
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
.ant-btn-primary:hover:not(:disabled) {
  background: #4096ff;
  border-color: #4096ff;
  color: #fff;
}
.code-json {
  display: block;
  width: 100%;
  min-height: 240px;
  padding: 8px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.88);
  background-color: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.code-json:focus {
  border-color: #1677ff;
  background-color: #fff;
}
.code-error {
  margin-top: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #ff4d4f;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
}
.code-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #8c8c8c;
}
</style>