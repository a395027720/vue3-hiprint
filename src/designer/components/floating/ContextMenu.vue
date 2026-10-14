<!--
  始终渲染 4 组菜单,各项按需 enabled/disabled:
    1. 删除 / 复制 / 剪切 / 粘贴(粘贴只看剪贴板;其余看 hasSelection)
    2. 置于顶层 / 置于底层 / 上移一层 / 下移一层(看元素位置)
    3. 锁定 / 取消锁定(看 hasSelection)
    4. 撤销 / 重做(看 canUndo / canRedo)
  画布空白处右键时 element=null,hasSelection=false,层级 4 项 + 编辑组
  前 3 项 + 锁定自动 disabled,只粘贴/撤销/重做可能可用。
  click outside / ESC 关闭。
-->
<template>
  <div
    v-if="open"
    ref="menuRef"
    class="ctx-menu"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
    @contextmenu.prevent
  >
    <button class="ctx-item" :disabled="!hasSelection" @click="$emit('remove')">
      <span class="ctx-icon">×</span>删除
    </button>
    <button class="ctx-item" :disabled="!hasSelection" @click="$emit('copy')">
      <span class="ctx-icon">⎘</span>复制
    </button>
    <button class="ctx-item" :disabled="!hasSelection" @click="$emit('cut')">
      <span class="ctx-icon">✂</span>剪切
    </button>
    <button class="ctx-item" :disabled="!hasClipboard" @click="$emit('paste')">
      <span class="ctx-icon">⎗</span>粘贴
    </button>

    <div class="ctx-sep" />

    <button class="ctx-item" :disabled="!canBringToFront" @click="$emit('bringToFront')">
      <span class="ctx-icon">⤒</span>置于顶层
    </button>
    <button class="ctx-item" :disabled="!canSendToBack" @click="$emit('sendToBack')">
      <span class="ctx-icon">⤓</span>置于底层
    </button>
    <button class="ctx-item" :disabled="!canMoveUp" @click="$emit('moveUp')">
      <span class="ctx-icon">↑</span>上移一层
    </button>
    <button class="ctx-item" :disabled="!canMoveDown" @click="$emit('moveDown')">
      <span class="ctx-icon">↓</span>下移一层
    </button>

    <div class="ctx-sep" />

    <button class="ctx-item" :disabled="!hasSelection" @click="$emit('toggleLock')">
      <span class="ctx-icon">{{ element?.locked ? '🔓' : '🔒' }}</span>{{ element?.locked ? '取消锁定' : '锁定' }}
    </button>

    <div class="ctx-sep" />

    <button class="ctx-item" :disabled="!canUndo" @click="$emit('undo')">
      <span class="ctx-icon">↶</span>撤销
    </button>
    <button class="ctx-item" :disabled="!canRedo" @click="$emit('redo')">
      <span class="ctx-icon">↷</span>重做
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Element } from '../../core/types'

const props = defineProps<{
  open: boolean
  pos: { x: number; y: number }
  element: Element | null
  hasSelection: boolean
  hasClipboard: boolean
  canUndo: boolean
  canRedo: boolean
  canBringToFront: boolean
  canSendToBack: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  close: []
  remove: []
  copy: []
  cut: []
  paste: []
  bringToFront: []
  sendToBack: []
  moveUp: []
  moveDown: []
  toggleLock: []
  undo: []
  redo: []
}>()

const menuRef = ref<HTMLElement | null>(null)

function onDocMouseDown(e: MouseEvent) {
  if (!menuRef.value) return
  if (!menuRef.value.contains(e.target as Node)) emit('close')
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 10000;
  min-width: 160px;
  padding: 4px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 13px;
  color: #333;
  user-select: none;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  border-radius: 3px;
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.ctx-item:hover:not(:disabled) {
  background: #f5f5f5;
  color: #1677ff;
}
.ctx-item:disabled {
  color: #bfbfbf;
  cursor: not-allowed;
}
.ctx-icon {
  display: inline-flex;
  width: 16px;
  justify-content: center;
  font-weight: bold;
  color: inherit;
}
.ctx-sep {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}
</style>
