// 生成裁判端三级行政区数据（省/市/区），来源：modood/Administrative-divisions-of-China（MIT）。
// 运行时只用到前三级；街道级数据体积大且与本项目无关，生成时丢弃。
// 用法：node scripts/generate-regions.mjs
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = 'https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/pcas-code.json'
const response = await fetch(source)
if (!response.ok) throw new Error(`下载行政区数据失败：${response.status}`)
const provinces = await response.json()

const data = provinces.map((province) => ({
  code: province.code,
  name: province.name,
  cities: province.children.map((city) => ({
    code: city.code,
    name: city.name,
    districts: city.children.map((district) => ({ code: district.code, name: district.name })),
  })),
}))

const body = `// 由 scripts/generate-regions.mjs 生成，请勿手工编辑。
// 数据来源：modood/Administrative-divisions-of-China（MIT License），仅保留省/市/区三级。
export interface RegionDistrict { readonly code: string; readonly name: string }
export interface RegionCity { readonly code: string; readonly name: string; readonly districts: readonly RegionDistrict[] }
export interface RegionProvince { readonly code: string; readonly name: string; readonly cities: readonly RegionCity[] }

export const regionProvinces: readonly RegionProvince[] = ${JSON.stringify(data)}

/** 直辖市区县在数据里挂在“市辖区/县”等虚拟层级下，展示时省略该级。 */
const virtualCityNames = new Set(['市辖区', '县', '省直辖县级行政区划', '自治区直辖县级行政区划'])

/** 拼接便于人读的完整行政区名称，例如 上海市/徐汇区。 */
export function regionLabel(province: RegionProvince, city: RegionCity, district: RegionDistrict): string {
  const parts = [province.name, virtualCityNames.has(city.name) ? '' : city.name, district.name].filter(Boolean)
  return parts.join('/')
}
`
const target = resolve(import.meta.dirname, '../apps/referee-web/src/content/regions.ts')
await writeFile(target, body, 'utf8')
console.log(`写入 ${target}（${(body.length / 1024).toFixed(1)} KB）`)
