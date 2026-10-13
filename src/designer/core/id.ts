/**
 * 简单的 id 生成器,用于元素 id。
 * 不依赖 crypto API,保证 SSR / 老浏览器兼容。
 */

let counter = 0

/**
 * 生成一个 8 字符的短 id。
 * 格式: el_<base36 timestamp><base36 counter>,例如 'el_l2x8k9a3'
 * 同一毫秒内调用也能保证唯一(counter 递增)。
 */
export function nextId(prefix = 'el_'): string {
  counter = (counter + 1) % 0xffffff
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`
}
