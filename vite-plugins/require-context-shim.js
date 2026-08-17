import fs from 'node:fs'
import path from 'node:path'

// src/hiprint/hiprint.bundle.js:67-71 是 webpack-only 的 require.context 用法
// 这里把它在编译期展开为静态 import + 字面量对象，bundle.js 主体代码 0 改动
const TARGET = 'const ctx = require.context("../i18n", true, /\\.json$/);' +
  '\nctx.keys().forEach(key => {' +
  '\n  languages[key.match(/\\.\\/([^.]+)/)[1]] = ctx(key)' +
  '\n})'

export default function requireContextShim() {
  return {
    name: 'require-context-shim',
    enforce: 'post',
    transform(code, id) {
      if (!id.endsWith('hiprint.bundle.js')) return null
      if (!code.includes('require.context')) return null

      const i18nDir = path.resolve(process.cwd(), 'src/i18n')
      const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json'))

      const importLines = []
      const mapEntries = []
      for (const f of files) {
        const lang = f.replace(/\.json$/, '')
        const importName = `__i18n_${lang.replace('-', '_').replace(/\./g, '_')}`
        importLines.push(`import ${importName} from '../i18n/${f}';`)
        mapEntries.push(`  "${lang}": ${importName}`)
      }

      const replacement =
        importLines.join('\n') +
        '\nObject.assign(languages, {\n' +
        mapEntries.join(',\n') +
        '\n});'

      if (!code.includes(TARGET)) {
        this.warn(`[require-context-shim] hiprint.bundle.js 中未找到目标 require.context 代码块`)
        return null
      }

      return {
        code: code.replace(TARGET, replacement),
        map: null,
      }
    },
  }
}