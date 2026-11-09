// 生成国际电话国家/地区代码表，供账号设置页的国家代码下拉框使用。
// 数据来源：libphonenumber-js 的 metadata.min.json（Apache-2.0），同一国家代码下的地区按 ISO 3166-1 alpha-2 列出。
// 只落盘国家代码与地区代码；中文名在运行时由 Intl.DisplayNames 解析，避免打包名称表。
// 用法：node scripts/generate-dial-codes.mjs
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const version = '1.12.16'
const source = `https://unpkg.com/libphonenumber-js@${version}/metadata.min.json`
const response = await fetch(source)
if (!response.ok) throw new Error(`下载国家代码数据失败：${response.status}`)
const metadata = await response.json()

/** 国家代码按数字升序，长代码（如 +1242）不会被短代码（+1）覆盖时更好阅读。 */
const groups = Object.entries(metadata.country_calling_codes)
  .map(([dial, regions]) => ({ dial: `+${dial}`, regions }))
  .sort((left, right) => Number(left.dial.slice(1)) - Number(right.dial.slice(1)))

const body = `// 由 scripts/generate-dial-codes.mjs 生成，请勿手工编辑。
// 数据来源：libphonenumber-js ${version} metadata（Apache-2.0 License）；regions 为 ISO 3166-1 alpha-2 地区代码。
export interface DialCodeGroup { readonly dial: string; readonly regions: readonly string[] }

export const dialCodeGroups: readonly DialCodeGroup[] = ${JSON.stringify(groups, null, 0)}
`
const target = resolve(import.meta.dirname, '../apps/referee-web/src/content/dial-codes.ts')
await writeFile(target, body, 'utf8')
console.log(`写入 ${target}（${groups.length} 个国家/地区代码，${(body.length / 1024).toFixed(1)} KB）`)
