import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = file => readFileSync(resolve(root, file), 'utf8').replace(/\r\n/g, '\n')
const digest = value => createHash('sha256').update(value).digest('hex')
const source = JSON.parse(read('third-party/naive-ui-admin/source.json'))
assert.equal(source.commit, 'c9db4cde447240eaa17fbe439f507680819add3d')
assert.equal(source.tag, 'v3.0.0')
assert.equal(source.license, 'MIT')
for (const file of source.files) assert.ok(existsSync(resolve(root, file.local)), file.local)
const license = read('third-party/naive-ui-admin/LICENSE')
assert.equal(digest(license), source.files.find(file => file.source === 'LICENSE').sha256)
assert.match(license, /Copyright \(c\) 2021-present Naive Ui Admin/)
assert.equal(read('dist/licenses/naive-ui-admin.txt'), license)

// 可选的离线上游核查直接读取固定 commit 的 Git blob，不受 checkout 行尾转换影响。
const upstream = process.argv.find(arg => arg.startsWith('--upstream='))?.slice('--upstream='.length)
if (upstream) {
  for (const file of source.files) {
    const original = execFileSync('git', ['-C', resolve(upstream), 'show', `${source.commit}:${file.source}`])
    const blob = execFileSync('git', ['-C', resolve(upstream), 'rev-parse', `${source.commit}:${file.source}`], { encoding: 'utf8' }).trim()
    assert.equal(blob, file.blob, file.source)
    assert.equal(digest(original), file.sha256, file.source)
  }
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name)
    return entry.isDirectory() ? files(path) : [path]
  })
}
const sourceFiles = files(resolve(root, 'src'))
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  assert.doesNotMatch(text, /localStorage|sessionStorage|indexedDB|serviceWorker|ACCESS_TOKEN|KeepAlive|keep-alive|mockjs|vite-plugin-mock|addRoute\(/, relative(root, file))
  if (file.endsWith('.vue')) {
    assert.ok(text.trimEnd().split('\n').length <= 230, file)
    assert.doesNotMatch(text, /\bfetch\s*\(|axios\./, file)
  }
}
assert.match(read('src/App.vue'), /import AdminLayout from '\.\/layout\/index.vue'/)
assert.match(read('src/layout/index.vue'), /<NLayoutSider[\s\S]*<NDrawer[\s\S]*<PageHeader[\s\S]*<MainView/)
assert.match(read('src/layout/components/Menu/index.vue'), /<NMenu/)
assert.match(read('src/layout/components/Main/index.vue'), /:key="route.fullPath"/)
assert.ok(!existsSync(resolve(root, 'src/components/layout/AdminShell.vue')))
for (const file of files(resolve(root, 'dist/assets')).filter(file => file.endsWith('.js'))) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /mockjs|vite-plugin-mock|mock-prod-server|ACCESS_TOKEN|\/mock\//, file)
}
const dependencies = JSON.parse(read('dist/licenses/dependencies.json'))
assert.ok(dependencies.length > 0)
for (const dependency of dependencies) assert.ok(['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'].includes(dependency.identifier), `${dependency.name}: ${dependency.identifier}`)
console.log(`通过：固定模板来源${upstream ? '及上游 blob/SHA-256' : ''}、MIT 原文及产物许可、${dependencies.length} 项依赖许可声明、模板装配、SFC 行数和安全裁剪检查。`)
