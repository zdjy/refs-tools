#!/usr/bin/env node
// 从 logo/ 下的品牌母版生成两个前端实际发布的品牌资源：
//   裁判端：PWA 图标、apple-touch-icon、favicon.ico、页面内使用的横版组合标
//   管理端：favicon.ico、侧边栏方形标（浅色/深色两版）
// 母版不进构建，派生文件才进 public/ 与 src/assets/。
// 之所以用脚本而不是手工导出：尺寸、留白、底色必须可复现，否则每次改图都会漂移。
// 背景色不写死，直接读裁判端 src/ui-tokens.ts 的 canvas token，保证图标与全局画布同色。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const logoDir = join(root, 'logo')
const refereeDir = join(root, 'apps', 'referee-web')
const adminDir = join(root, 'apps', 'admin-web')

// 母版：mark 为方形盾徽（自带底色），lockup 为「盾徽 + 裁衡 RefScope」横版组合标。
// denoise：母版曾以 JPEG 保存，平面色块上有压缩噪点，噪点会让 PNG 无法有效压缩；
// 在原始分辨率上做 3×3 中值滤波可以在不伤边线的前提下清掉它（已透明的母版跳过，避免腐蚀 alpha 边缘）。
const sources = {
  markLight: { path: join(logoDir, 'mark-light-theme-2048.png'), denoise: true },
  markDark: { path: join(logoDir, 'mark-dark-theme-2048.png'), denoise: true },
  lockupLight: { path: join(logoDir, 'lockup-light-theme-2752.png'), denoise: true },
  lockupDark: { path: join(logoDir, 'lockup-dark-theme-transparent-2752.png'), denoise: false },
}

// 图标主体占画布高度的比例。常规图标取 80%，与主流平台的主屏图标观感一致；
// maskable 必须落在居中直径 80% 的安全圆内，按盾徽宽高比反推约为 60%。
const FILL_REGULAR = 0.8
const FILL_MASKABLE = 0.6
const FILL_FAVICON = 0.9
// 侧边栏/页头里的方形标是透明底，四周不留多余空白，观感才与文字基线齐平。
const FILL_TRANSPARENT_MARK = 0.94
const LOCKUP_EXPORT_WIDTH = 1200
const TRANSPARENT_MARK_SIZE = 128
// 页头紧凑版把盾徽缩到母版的 62%：母版盾徽高约为主标题的 3.3 倍，放到 32px 高度时
// 主标题只剩 10px 上下，读不出来；缩小盾徽后主标题回到 15–20px，与导航文字同量级。
const COMPACT_SHIELD_SCALE = 0.62

// PNG 统一走调色板量化：图形是平面色块，256 色已无损，量化后体积约为真彩的一半以上。
const PNG_OUTPUT = { compressionLevel: 9, palette: true, colours: 256, dither: 0.4 }

function fail(message) {
  throw new Error(message)
}

// 读取全局画布色：图标底色必须与 UI 画布一致，否则与状态栏/启动画面拼接时会露出色边。
function readCanvasColor() {
  const tokens = readFileSync(join(refereeDir, 'src', 'ui-tokens.ts'), 'utf8')
  const match = tokens.match(/canvas:\s*'(#[0-9A-Fa-f]{6})'/)
  if (!match) fail('未能从 apps/referee-web/src/ui-tokens.ts 读取 canvas 色值')
  return match[1]
}

// 母版曾被手工改过扩展名，出现过「.png 后缀、JPEG 内容」的情况。
// 这里校验 magic bytes，避免把 JPEG 当 PNG 发布出去（manifest 声明 type=image/png 会失效）。
function assertPng(path) {
  const magic = readFileSync(path).subarray(0, 4).toString('hex')
  if (magic !== '89504e47') fail(`${path} 不是真正的 PNG（magic=${magic}），请先重新导出`)
}

async function decodeRgba({ path, denoise }) {
  assertPng(path)
  const pipeline = denoise ? sharp(path).median(3) : sharp(path)
  return pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
}

// 从画布边缘向内做洪水填充，把与四角同色的背景抹成透明。
// 只从边缘扩散而不是全局抠色：盾徽内部的白色球场线被底色包围，全局抠色会把它们一起吃掉。
function removeEdgeBackground({ data, info }, { tolerance = 12 } = {}) {
  const { width, height } = info
  const px = width * height
  const seed = [data[0], data[1], data[2]]
  const visited = new Uint8Array(px)
  const stack = new Int32Array(px)
  let top = 0

  const matches = (index) => {
    const i = index * 4
    return (
      Math.abs(data[i] - seed[0]) <= tolerance &&
      Math.abs(data[i + 1] - seed[1]) <= tolerance &&
      Math.abs(data[i + 2] - seed[2]) <= tolerance
    )
  }

  const push = (index) => {
    if (visited[index] || !matches(index)) return
    visited[index] = 1
    stack[top++] = index
  }

  for (let x = 0; x < width; x += 1) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width)
    push(y * width + width - 1)
  }

  while (top > 0) {
    const index = stack[--top]
    data[index * 4 + 3] = 0
    const x = index % width
    const y = (index - x) / width
    if (x > 0) push(index - 1)
    if (x < width - 1) push(index + 1)
    if (y > 0) push(index - width)
    if (y < height - 1) push(index + width)
  }
  return { data, info }
}

// 按 alpha 通道计算内容包围盒，去掉母版四周多余的留白。
function alphaBbox({ data, info }, { from = 0, to = info.width - 1, top = 0, bottom = info.height - 1 } = {}) {
  const { width } = info
  let left = to + 1
  let right = -1
  let upper = bottom + 1
  let lower = -1
  for (let y = top; y <= bottom; y += 1) {
    for (let x = from; x <= to; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 8) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < upper) upper = y
      if (y > lower) lower = y
    }
  }
  if (right < 0) return null
  return { left, top: upper, width: right - left + 1, height: lower - upper + 1 }
}

// 找出连续的墨迹区间，用来把组合标拆成「盾徽 / 主标题 / 副标题」几块。
function inkBands(values) {
  const bands = []
  let start = -1
  values.forEach((value, index) => {
    if (value > 0 && start < 0) start = index
    if (value === 0 && start >= 0) {
      bands.push([start, index - 1])
      start = -1
    }
  })
  if (start >= 0) bands.push([start, values.length - 1])
  return bands
}

function inkProfile({ data, info }, axis, { from = 0, to = info.width - 1, top = 0, bottom = info.height - 1 } = {}) {
  const { width } = info
  const length = axis === 'x' ? to - from + 1 : bottom - top + 1
  const profile = new Array(length).fill(0)
  for (let y = top; y <= bottom; y += 1) {
    for (let x = from; x <= to; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 40) continue
      profile[axis === 'x' ? x - from : y - top] += 1
    }
  }
  return profile
}

async function loadTrimmedMark(source) {
  const rgba = await decodeRgba(source)
  const transparent = removeEdgeBackground(rgba)
  const bbox = alphaBbox(transparent)
  const buffer = await sharp(transparent.data, { raw: { width: rgba.info.width, height: rgba.info.height, channels: 4 } })
    .extract(bbox)
    .png()
    .toBuffer()
  return { buffer, width: bbox.width, height: bbox.height }
}

// 生成方形图标：盾徽按高度比例缩放到目标画布，居中并铺满画布底色。
async function renderIcon(mark, size, fillRatio, canvas) {
  const targetHeight = Math.round(size * fillRatio)
  const scaled = await sharp(mark.buffer)
    .resize({ height: targetHeight, fit: 'inside', kernel: 'lanczos3' })
    .png()
    .toBuffer()

  return sharp({
    create: { width: size, height: size, channels: 4, background: canvas },
  })
    .composite([{ input: scaled, gravity: 'center' }])
    .png(PNG_OUTPUT)
    .toBuffer()
}

// 透明底方形标：盾徽居中，四周透明，供页面内按高度缩放使用。
async function renderTransparentMark(mark, size, fillRatio) {
  const scaled = await sharp(mark.buffer)
    .resize({ height: Math.round(size * fillRatio), fit: 'inside', kernel: 'lanczos3' })
    .png()
    .toBuffer()

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: scaled, gravity: 'center' }])
    .png(PNG_OUTPUT)
    .toBuffer()
}

// ICO 容器：Windows Vista 起支持内嵌 PNG 负载，这里按 16/32/48 三档打包，
// 小尺寸单独渲染而不是让浏览器缩放大图，避免细线糊成一片。
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  const directory = Buffer.alloc(16 * entries.length)
  let offset = 6 + 16 * entries.length
  const payloads = []
  entries.forEach(({ size, data }, index) => {
    const entry = index * 16
    directory.writeUInt8(size >= 256 ? 0 : size, entry)
    directory.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    directory.writeUInt8(0, entry + 2)
    directory.writeUInt8(0, entry + 3)
    directory.writeUInt16LE(1, entry + 4)
    directory.writeUInt16LE(32, entry + 6)
    directory.writeUInt32LE(data.length, entry + 8)
    directory.writeUInt32LE(offset, entry + 12)
    offset += data.length
    payloads.push(data)
  })
  return Buffer.concat([header, directory, ...payloads])
}

async function buildFavicon(mark, canvas) {
  const entries = []
  for (const size of [16, 32, 48]) {
    entries.push({ size, data: await renderIcon(mark, size, FILL_FAVICON, canvas) })
  }
  return buildIco(entries)
}

async function renderLockup(source, { stripBackground }) {
  const rgba = await decodeRgba(source)
  const prepared = stripBackground ? removeEdgeBackground(rgba, { tolerance: 6 }) : rgba
  const bbox = alphaBbox(prepared)
  return sharp(prepared.data, { raw: { width: rgba.info.width, height: rgba.info.height, channels: 4 } })
    .extract(bbox)
    .resize({ width: LOCKUP_EXPORT_WIDTH, kernel: 'lanczos3' })
    .png(PNG_OUTPUT)
    .toBuffer()
}

// 页头用的紧凑版组合标：保留盾徽与「裁衡 RefScope」主标题，去掉两行副标题。
// 完整组合标在 32–40px 高度下副标题会缩到 5px 以下，只剩一片灰糊，不如直接裁掉。
async function buildCompactLockup(lockup) {
  const rgba = await sharp(lockup).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { info } = rgba

  const columns = inkBands(inkProfile(rgba, 'x'))
  if (columns.length < 2) fail('组合标中没有找到「盾徽 + 文字」的分栏，无法生成紧凑版')
  const [shieldStart, shieldEnd] = columns[0]
  const textStart = columns[1][0]

  const rows = inkBands(inkProfile(rgba, 'y', { from: textStart }))
  // 主标题、中文副标题、英文副标题各占一行；若只剩一行说明母版已不含副标题。
  if (rows.length > 1) {
    const [titleTop, titleBottom] = rows[0]
    const titleHeight = titleBottom - titleTop + 1
    const nextHeight = rows[1][1] - rows[1][0] + 1
    if (titleHeight < nextHeight * 1.5) fail('无法可靠区分主标题与副标题行，请检查组合标母版')
  }
  const [titleTop, titleBottom] = rows[0]

  const shield = await sharp(lockup)
    .extract({ left: shieldStart, top: 0, width: shieldEnd - shieldStart + 1, height: info.height })
    .png()
    .toBuffer()
  const title = await sharp(lockup)
    .extract({ left: textStart, top: titleTop, width: info.width - textStart, height: titleBottom - titleTop + 1 })
    .png()
    .toBuffer()

  const gap = Math.round((textStart - shieldEnd - 1) * COMPACT_SHIELD_SCALE)
  const shieldMeta = await sharp(shield).metadata()
  const titleMeta = await sharp(title).metadata()
  const shieldWidth = Math.round(shieldMeta.width * COMPACT_SHIELD_SCALE)
  const shieldHeight = Math.round(shieldMeta.height * COMPACT_SHIELD_SCALE)
  const scaledShield = await sharp(shield)
    .resize({ width: shieldWidth, height: shieldHeight, fit: 'fill' })
    .png()
    .toBuffer()
  const height = Math.max(shieldHeight, titleMeta.height)

  return sharp({
    create: {
      width: shieldWidth + gap + titleMeta.width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: scaledShield, left: 0, top: Math.round((height - shieldHeight) / 2) },
      { input: title, left: shieldWidth + gap, top: Math.round((height - titleMeta.height) / 2) },
    ])
    .png(PNG_OUTPUT)
    .toBuffer()
}

export async function generateBrandIcons() {
  const canvas = readCanvasColor()
  for (const source of Object.values(sources)) assertPng(source.path)

  const refereePublic = join(refereeDir, 'public')
  const refereeIcons = join(refereePublic, 'icons')
  const refereeBrand = join(refereeDir, 'src', 'assets', 'brand')
  const adminPublic = join(adminDir, 'public')
  const adminBrand = join(adminDir, 'src', 'assets', 'images', 'brand')
  for (const dir of [refereeIcons, refereeBrand, adminPublic, adminBrand]) mkdirSync(dir, { recursive: true })

  const written = []
  const emit = (path, buffer) => {
    writeFileSync(path, buffer)
    written.push([path, buffer.length])
  }

  const markLight = await loadTrimmedMark(sources.markLight)
  const markDark = await loadTrimmedMark(sources.markDark)

  // 裁判端：PWA 图标与 apple-touch-icon 必须是不透明底色，否则平台会补黑底。
  emit(join(refereeIcons, 'icon-192.png'), await renderIcon(markLight, 192, FILL_REGULAR, canvas))
  emit(join(refereeIcons, 'icon-512.png'), await renderIcon(markLight, 512, FILL_REGULAR, canvas))
  // maskable 会被平台裁成圆形/超椭圆，盾徽必须整体落在安全圆内，底色则要铺满整块画布。
  emit(join(refereeIcons, 'icon-maskable-512.png'), await renderIcon(markLight, 512, FILL_MASKABLE, canvas))
  emit(join(refereePublic, 'apple-touch-icon.png'), await renderIcon(markLight, 180, FILL_REGULAR, canvas))
  emit(join(refereePublic, 'favicon.ico'), await buildFavicon(markLight, canvas))

  // 横版组合标：完整版留档，紧凑版用于页头（放 src/assets 走打包，未引用时不会进产物）。
  const lockupLight = await renderLockup(sources.lockupLight, { stripBackground: true })
  emit(join(refereeBrand, 'lockup-light.png'), lockupLight)
  emit(join(refereeBrand, 'lockup-dark.png'), await renderLockup(sources.lockupDark, { stripBackground: false }))
  emit(join(refereeBrand, 'lockup-compact.png'), await buildCompactLockup(lockupLight))

  // 管理端：浏览器图标与侧边栏方形标（深色主题用带奶白外圈的版本，避免黑描边溶进深底）。
  emit(join(adminPublic, 'favicon.ico'), await buildFavicon(markLight, canvas))
  emit(join(adminBrand, 'mark-light.png'), await renderTransparentMark(markLight, TRANSPARENT_MARK_SIZE, FILL_TRANSPARENT_MARK))
  emit(join(adminBrand, 'mark-dark.png'), await renderTransparentMark(markDark, TRANSPARENT_MARK_SIZE, FILL_TRANSPARENT_MARK))

  return { canvas, written }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { canvas, written } = await generateBrandIcons()
    console.log(`[brand] 画布底色 ${canvas}`)
    for (const [path, bytes] of written) {
      console.log(`[brand] ${path.replace(`${root}${path.includes('/') ? '/' : ''}`, '').replaceAll('\\', '/')}  ${(bytes / 1024).toFixed(1)} KB`)
    }
  } catch (error) {
    console.error(`[brand] ${error.message}`)
    process.exitCode = 1
  }
}
