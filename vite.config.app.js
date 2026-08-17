import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import requireContextShim from './vite-plugins/require-context-shim.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue(), requireContextShim()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // hiprint.bundle.js 用了 nzh 的深层路径，但 nzh 包的 exports 字段未暴露
      // 这里把深层路径重定向到 nzh 入口，构建层适配，bundle.js 主体不动
      'nzh/dist/nzh.min.js': 'nzh',
      // concurrent-tasks@1.0.7 的 es/index.js 引用了未导出的 setAppropriateConcurrency，
      // 改用 CJS 入口 lib/index.js（该路径无 bug）
      'concurrent-tasks': 'concurrent-tasks/lib/index.js',
    },
    extensions: ['.mjs', '.js', '.json', '.vue'],
  },
  base: '/vue3-hiprint/',
  // 避免写入 node_modules/.vite（当 node_modules 是 root-owned 时普通用户无权创建）
  cacheDir: '.vite-cache',
  build: {
    outDir: 'demo',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      // demo 内不需要把这些 UMD 库走 externals（demo 通过 index.html 的 CDN <script> 注入）
      // 让 Vite 把它们正常打进 bundle 即可
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})