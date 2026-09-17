import { ref, markRaw } from 'vue'
import { message } from 'ant-design-vue'
import { hiprint } from '../../index.js'

/**
 * 一站式 hiprint composable：收敛 init + providers + 模板 + 打印 + clear + guard
 *
 * 替代原本散落的 5 个 composable（usePrintTemplate/usePrintActions/useClearTemplate/
 * useConnectionGuard/useProviders），单一入口。
 *
 * 用法：
 *
 *   import { useHiprint, defaultElementTypeProvider } from 'vue3-hiprint'
 *
 *   const {
 *     template, build, print, print2, toPdf, clear, guard, printing,
 *   } = useHiprint({
 *     template: templateJson,
 *     providers: [new defaultElementTypeProvider()],
 *     moduleName: 'defaultModule',
 *     title: '订单打印',
 *   })
 *
 *   onMounted(() => build())  // 也可 autoBuild: true 省掉这一步
 *
 *   function handlePrint2() { print2(printData) }
 *   function handleClear() { clear() }
 *
 * @param {object} [options]
 * @param {object} [options.template] 模板 JSON
 * @param {Array | object | (() => Array | object)} [options.providers=[]]
 *        拖拽元素 providers，单个 / 数组 / 函数均可（函数用于模式切换场景）
 * @param {string} [options.moduleName='defaultModule'] provider module 名
 * @param {() => string} [options.styleHandler] print/toPdf 的 styleHandler
 * @param {string} [options.pdfFileName='打印预览pdf']
 * @param {string} [options.elementContainer='.hiprintEpContainer'] 左侧拖拽容器
 * @param {string} [options.designContainer='#hiprint-printTemplate']
 * @param {string} [options.settingContainer='#PrintElementOptionSetting']
 * @param {string} [options.paginationContainer='.hiprint-printPagination']
 * @param {object} [options.designOptions={}] 透传给 .design() 第二参
 * @param {object} [options.templateOptions={}] 透传给 PrintTemplate 构造函数
 * @param {boolean} [options.autoInit=false] 是否在调用 useHiprint 时立即 init providers
 * @param {boolean} [options.autoBuild=false] 是否立即 build 模板
 * @returns {{
 *   template: import('vue').Ref,
 *   build: (tpl?: object) => object,
 *   rebuild: (tpl?: object) => object,
 *   print: (data: object, opts?: object) => void,
 *   print2: (data: object, opts?: object) => boolean,
 *   toPdf: (data: object, name?: string, opts?: object) => Promise,
 *   clear: () => boolean,
 *   printing: import('vue').Ref,
 *   guard: { run: (op: () => void) => boolean },
 *   initProviders: (opts?: { providers?, moduleName? }) => void,
 * }}
 */
export function useHiprint(options = {}) {
  const {
    template,
    providers = [],
    moduleName = 'defaultModule',
    styleHandler: defaultStyleHandler = null,
    pdfFileName = '打印预览pdf',
    elementContainer = '.hiprintEpContainer',
    designContainer = '#hiprint-printTemplate',
    settingContainer = '#PrintElementOptionSetting',
    paginationContainer = '.hiprint-printPagination',
    designOptions = {},
    templateOptions = {},
    autoInit = false,
    autoBuild = false,
    onGuardFail = null,
  } = options

  const tplRef = ref(null)
  const printing = ref(false)

  /**
   * 注册 providers + 清空 element container + build element type
   */
  function initProviders(opts = {}) {
    const p = opts.providers ?? providers
    const name = opts.moduleName ?? moduleName
    const list = typeof p === 'function' ? p() : (Array.isArray(p) ? p : [p])
    hiprint.init({ providers: list })
    // bundle.js 内部用 jQuery 清空 + build element type，jQuery selector 是其官方用法
    if (typeof elementContainer === 'string') {
      window.jQuery?.(elementContainer).empty?.()
    }
    hiprint.PrintElementTypeManager.build(elementContainer, name)
  }

  /**
   * 建模板 + design
   */
  function build(tpl = template) {
    if (typeof designContainer === 'string') {
      document.querySelector(designContainer)?.replaceChildren()
    }
    tplRef.value = markRaw(new hiprint.PrintTemplate({
      template: tpl,
      settingContainer,
      paginationContainer,
      ...templateOptions,
    }))
    tplRef.value.design(designContainer, designOptions)
    return tplRef.value
  }

  function rebuild(tpl) { return build(tpl) }

  /**
   * 清空画布（统一 try/catch + message.error）
   */
  function clear() {
    const tpl = tplRef.value
    if (!tpl) return false
    try {
      tpl.clear()
      return true
    } catch (e) {
      message.error(`操作失败: ${e}`)
      return false
    }
  }

  /**
   * 客户端连接守卫：已连接执行 op，未连接调 onGuardFail（由 demo 注入）。
   * 不绑任何 UI 库，UI 提示由 demo 决定。
   * @param {() => void} op
   * @param {object} [opts]
   * @param {() => void} [opts.onFail] 临时覆盖 onGuardFail
   */
  function guardRun(op, opts = {}) {
    if (window.hiwebSocket && window.hiwebSocket.opened) {
      op()
      return true
    }
    ;(opts.onFail ?? onGuardFail)?.()
    return false
  }

  /**
   * 浏览器打印（弹系统打印预览）
   */
  function print(data, opts = {}) {
    const tpl = tplRef.value
    if (!tpl) return
    printing.value = true
    tpl.print(data, {}, {
      ...(defaultStyleHandler && { styleHandler: defaultStyleHandler }),
      ...opts,
      callback: () => {
        printing.value = false
        opts.callback?.()
      }
    })
  }

  /**
   * 客户端直接打印（socket.io，已内置 guard 弹窗）
   */
  function print2(data, opts = {}) {
    guardRun(() => {
      const tpl = tplRef.value
      if (!tpl) return
      // opts.title 等调用时参数,完全透传,不内置 fallback
      tpl.print2(data, { printer: '', ...opts })
    }, opts)
  }

  /**
   * 导出 PDF
   */
  function toPdf(data, name = pdfFileName, opts = {}) {
    const tpl = tplRef.value
    if (!tpl) return Promise.reject(new Error('no template'))
    return tpl.toPdf(data, name, {
      ...(defaultStyleHandler && { styleHandler: defaultStyleHandler }),
      ...opts
    })
  }

  if (autoInit) initProviders()
  if (autoBuild) build()

  return {
    template: tplRef,
    build,
    rebuild,
    print,
    print2,
    toPdf,
    clear,
    printing,
    guard: { run: guardRun },
    initProviders,
  }
}