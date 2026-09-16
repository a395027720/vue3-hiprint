import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import copy from 'rollup-plugin-copy'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import requireContextShim from './vite-plugins/require-context-shim.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'nzh/dist/nzh.min.js': 'nzh',
    },
  },
  plugins: [
    vue(),
    requireContextShim(),
    // 把 CSS 字符串内联到 JS bundle,运行时注入 <style>,消费方无需手动 import style.css
    // 这样 print-lock.css 走 media="print" 的契约也不变(plugin 不影响 media 行为)
    cssInjectedByJsPlugin(),
    copy({
      targets: [
        { src: 'src/hiprint/css/print-lock.css', dest: 'dist' },
      ],
      hook: 'writeBundle',
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'vue3-hiprint',
      formats: ['umd', 'es'],
      fileName: (format) => (format === 'es' ? 'vue3-hiprint.esm.js' : 'vue3-hiprint.js'),
    },
    rollupOptions: {
      external: [
        'jquery',
        '@claviska/jquery-minicolors',
        'jsbarcode',
        'socket.io-client',
        '@wtto00/html2canvas',
        'canvg',
        'jspdf',
        'bwip-js',
        'nzh',
        'vue',
      ],
      output: {
        globals: {
          jquery: 'jQuery',
          '@claviska/jquery-minicolors': 'jQuery',
          jsbarcode: 'JsBarcode',
          'socket.io-client': 'io',
          '@wtto00/html2canvas': 'html2canvas',
          canvg: 'canvg',
          jspdf: 'jspdf',
          'bwip-js': 'bwip-js',
          nzh: 'Nzh',
          vue: 'Vue',
        },
      },
    },
  },
})