/**
 * 把 src/designer 源码 esbuild bundle 到 dist-test/designer.mjs,
 * 供 node --test 跑单测用。
 *
 * 跑: node scripts/build-test.mjs
 */
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

await build({
  entryPoints: [path.resolve(root, 'src/designer/core/schema.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: path.resolve(root, 'dist-test/schema.mjs'),
  target: 'node18',
  logLevel: 'error',
})

await build({
  entryPoints: [path.resolve(root, 'src/designer/core/render.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: path.resolve(root, 'dist-test/render.mjs'),
  target: 'node18',
  logLevel: 'error',
})

await build({
  entryPoints: [path.resolve(root, 'src/designer/core/align.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: path.resolve(root, 'dist-test/align.mjs'),
  target: 'node18',
  logLevel: 'error',
})

await build({
  entryPoints: [path.resolve(root, 'src/designer/core/history.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: path.resolve(root, 'dist-test/history.mjs'),
  target: 'node18',
  logLevel: 'error',
})

console.log('[test] built dist-test/{schema,render,align,history}.mjs')
