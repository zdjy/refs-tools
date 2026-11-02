import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { build } from 'vite'

const app = fileURLToPath(new URL('../', import.meta.url))
const fixture = resolve(app, 'src', `tailwind-check-${process.pid}.html`)
const outside = resolve(app, `tailwind-outside-${process.pid}.html`)
const classes = [
  'bg-canvas', 'bg-sand', 'bg-facet', 'bg-surface', 'bg-soft',
  'text-ink', 'text-body', 'text-muted', 'border-line', 'text-red', 'text-green', 'text-black',
  'font-sans', 'font-mono', 'shadow-card', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
  'xs:grid-cols-2', 'sm:gap-6', 'md:flex', 'lg:grid-cols-4',
  'hover:text-red-hover', 'focus-visible:ring-red/30', 'motion-reduce:transition-none', 'min-h-[44px]',
  'bg-blue-500', 'rounded-lg', 'shadow-2xl', 'xl:block', 'font-serif',
]

// 构建检查独立于低内存单测，临时源文件只用于验证扫描与生成，不写入 dist。
try {
  await writeFile(fixture, `<div class="${classes.join(' ')}"></div>`)
  await writeFile(outside, '<div class="w-[12347px]"></div>')
  const result = await build({ root: app, build: { write: false }, logLevel: 'error' })
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output
  const css = outputs.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
    .map((item) => String(item.source)).join('\n')

  for (const token of ['canvas', 'sand', 'facet', 'surface', 'soft', 'ink', 'body', 'muted', 'line', 'red', 'green', 'black', 'font', 'shadow', 'red-hover']) {
    assert(css.includes(`var(--${token})`), `缺少 token 映射：${token}`)
  }
  for (const selector of [
    String.raw`.xs\:grid-cols-2`, String.raw`.sm\:gap-6`, String.raw`.md\:flex`, String.raw`.lg\:grid-cols-4`,
    String.raw`.hover\:text-red-hover:hover`, String.raw`.focus-visible\:ring-red\/30:focus-visible`,
    String.raw`.motion-reduce\:transition-none`, String.raw`.min-h-\[44px\]`, '.font-sans', '.font-mono',
    '.shadow-card', '.rounded-xl', '.rounded-2xl', '.rounded-3xl', '.rounded-full',
  ]) {
    assert(css.includes(selector), `缺少工具类：${selector}`)
  }
  for (const width of [375, 480, 768, 1100]) {
    assert(new RegExp(`@media\\s*\\(width\\s*>=\\s*${width}px\\)`).test(css), `缺少断点：${width}`)
  }
  for (const forbidden of ['.bg-blue-500', '.rounded-lg{', '.shadow-2xl', String.raw`.xl\:block`, '.font-serif', '12347px', 'oklch(', '::file-selector-button', 'box-sizing:border-box;margin:0;padding:0']) {
    assert(!css.includes(forbidden), `意外生成默认主题、Preflight 或扫描范围外规则：${forbidden}`)
  }
  assert(!css.includes('@theme') && !css.includes('@source'), 'Tailwind 指令未被编译')
  console.log('通过：语义 token、四档断点、状态与任意值类生成正确；默认主题、Preflight 和扫描范围外规则未进入产物。')
} finally {
  await Promise.all([fixture, outside].map((path) => unlink(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })))
}
