import { Modal } from 'ant-design-vue'

/**
 * 检查客户端是否连接的 composable
 *
 * 4 demo 中 5 处 `'客户端未连接'` Modal.error 重复，封装成一个 guard。
 *
 * 用法：
 *
 *   import { useConnectionGuard } from '@/demo/components/useConnectionGuard'
 *
 *   const guard = useConnectionGuard()
 *   function print(tpl, data, options) {
 *     guard.run(() => tpl.print2(data, options))
 *   }
 *
 * 是否连接通过 `window.hiwebSocket?.opened` 判断——electron-hiprint 客户端连接后
 * 会把这个字段置 true，关闭后置 false。
 */
export function useConnectionGuard() {
  return {
    /**
     * 若客户端已连接执行 op，否则弹 Modal.error 提示用户
     * @param {() => void} op 要执行的操作（已绑定参数）
     * @returns {boolean} 是否执行
     */
    run(op) {
      if (window.hiwebSocket && window.hiwebSocket.opened) {
        op()
        return true
      }
      Modal.error({
        title: '客户端未连接',
        content: '请先下载并运行 electron-hiprint 打印服务（详见 README 中的 electron-hiprint 章节）。',
        okText: '我知道了'
      })
      return false
    }
  }
}
