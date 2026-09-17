import { markRaw } from 'vue'
import { hiprint } from '../../index.js'

/**
 * 顶层函数版"建模板"，Options API 友好
 *
 * composable 版 usePrintTemplate 依赖 ref 上下文，Options API / 摸鱼版写法难复用。
 * 本函数返回一个 markRaw 后的 PrintTemplate 实例，由调用方自己决定何时 design。
 *
 * 用法：
 *
 *   import { createPrintTemplate } from 'vue3-hiprint'
 *
 *   const tpl = createPrintTemplate({
 *     template: panel,
 *     onImageChooseClick: ...,
 *     fontList: [...],
 *     dataMode: 1,
 *     history: true,
 *   })
 *   tpl.design('#hiprint-printTemplate', { grid: true })
 *
 * @param {object} options
 * @param {object} options.template 模板 JSON
 * @param {string} [options.settingContainer='#PrintElementOptionSetting']
 * @param {string} [options.paginationContainer='.hiprint-printPagination']
 * @param {object} [options.templateOptions={}] 透传给 PrintTemplate 构造函数
 * @returns {object} markRaw 后的 PrintTemplate 实例
 */
export function createPrintTemplate(options = {}) {
  const {
    template,
    settingContainer = '#PrintElementOptionSetting',
    paginationContainer = '.hiprint-printPagination',
    templateOptions = {},
  } = options
  return markRaw(new hiprint.PrintTemplate({
    template,
    settingContainer,
    paginationContainer,
    ...templateOptions,
  }))
}