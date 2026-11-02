import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { build } from 'vite'

const app = fileURLToPath(new URL('../', import.meta.url))
const fixture = resolve(app, 'src', `tailwind-check-${process.pid}.html`)
const outside = resolve(app, `tailwind-outside-${process.pid}.html`)
const breakpoints = [['xs', 375], ['sm', 480], ['compact', 640], ['md', 768], ['tablet', 960], ['lg', 1100], ['xl', 1280], ['2xl', 1536]]
const classes = [
  'bg-canvas', 'bg-sand', 'bg-facet', 'bg-surface', 'bg-soft',
  'text-ink', 'text-body', 'text-muted', 'border-line', 'text-red', 'text-green', 'text-black',
  'font-sans', 'font-mono', 'shadow-card', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
  ...breakpoints.map(([name]) => `${name}:gap-6`),
  'md:grid-cols-3', 'md:first:col-auto', 'tablet:grid', 'xl:col-start-2', '2xl:grid-cols-5',
  'hover:text-red-hover', 'focus-visible:ring-red/30', 'motion-reduce:transition-none', 'min-h-[44px]',
  'bg-blue-500', 'rounded-lg', 'shadow-2xl', '3xl:block', 'font-serif',
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
    ...breakpoints.map(([name]) => `.${name === '2xl' ? String.raw`\32 xl` : name}\\:gap-6`),
    String.raw`.compact\:grid-cols-2`, String.raw`.md\:grid-cols-3`, String.raw`.md\:first\:col-auto`,
    String.raw`.tablet\:grid`, String.raw`.xl\:col-start-2`, String.raw`.\32 xl\:grid-cols-5`,
    String.raw`.hover\:text-red-hover:hover`, String.raw`.focus-visible\:ring-red\/30:focus-visible`,
    String.raw`.motion-reduce\:transition-none`, String.raw`.min-h-\[44px\]`, '.font-sans', '.font-mono',
    '.shadow-card', '.rounded-xl', '.rounded-2xl', '.rounded-3xl', '.rounded-full',
  ]) {
    assert(css.includes(selector), `缺少工具类：${selector}`)
  }
  let previousIndex = -1
  for (const [name, width] of breakpoints) {
    const index = css.search(new RegExp(`@media\\s*\\(width\\s*>=\\s*${width}px\\)`))
    assert(index > previousIndex, `断点缺失或顺序错误：${name} (${width}px)`)
    previousIndex = index
  }
  const widths = [...new Set([...css.matchAll(/@media\s*\(width\s*>=\s*(\d+)px\)/g)].map((match) => Number(match[1])))]
  assert.deepEqual(widths, breakpoints.map(([, width]) => width), '产物包含未登记的宽度断点')
  for (const forbidden of ['.bg-blue-500', '.rounded-lg{', '.shadow-2xl', String.raw`.\33 xl\:block`, '.font-serif', '12347px', 'oklch(', '::file-selector-button', 'box-sizing:border-box;margin:0;padding:0']) {
    assert(!css.includes(forbidden), `意外生成默认主题、Preflight 或扫描范围外规则：${forbidden}`)
  }
  assert(!css.includes('@theme') && !css.includes('@source'), 'Tailwind 指令未被编译')
  console.log('通过：语义 token、八档断点及其顺序、响应式布局、状态与任意值类生成正确；默认主题、Preflight 和扫描范围外规则未进入产物。')
} finally {
  await Promise.all([fixture, outside].map((path) => unlink(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })))
}
