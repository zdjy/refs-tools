import { dialCodeGroups } from '../content/dial-codes'

/**
 * 手机号的纯转换逻辑：档案里只存 E.164 字符串（`+8613800138000`），
 * 界面上拆成「国家/地区代码 + 本地号码」两段，避免用户手打国家代码出错。
 * 本模块不依赖 Vue，可独立单测。
 */

/** 少数地区没有中文区域名（Intl.DisplayNames 会直接回显代码），补上便于展示与搜索的名称。 */
const regionNameOverrides: Record<string, string> = { AC: '阿森松岛', TA: '特里斯坦-达库尼亚', XK: '科索沃' }

const regionDisplayNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })

function regionName(isoCode: string): string {
  const override = regionNameOverrides[isoCode]
  if (override) return override
  try { return regionDisplayNames.of(isoCode) ?? isoCode } catch { return isoCode }
}

export interface DialCodeOption {
  /** 国家/地区代码，含 `+`，例如 `+86`。 */
  readonly value: string
  /** 下拉框展示文本，例如 `中国 +86`。 */
  readonly label: string
  /** 该代码下的全部地区中文名，用于搜索。 */
  readonly names: readonly string[]
  /** 该代码下的 ISO 3166-1 alpha-2 地区代码，用于搜索。 */
  readonly regions: readonly string[]
}

/** 中国大陆裁判是主要使用者，把 `+86` 置顶，其余按中文名排序（由 Intl 提供拼音顺序）。 */
export const DEFAULT_DIAL_CODE = '+86'

/** E.164 最长 15 位数字，含 1–4 位国家代码，因此本地号码最多 14 位。 */
export const NATIONAL_DIGITS_MAX = 14

function optionOf(group: { dial: string; regions: readonly string[] }): DialCodeOption {
  const names = group.regions.map(regionName)
  // 同一代码覆盖多个地区（如 +1）时不必逐个列出，搜索仍能命中全部名称。
  const head = names.length === 1 ? names[0]! : `${names[0]}等${names.length}个地区`
  return { value: group.dial, label: `${head} ${group.dial}`, names, regions: group.regions }
}

export const dialCodeOptions: readonly DialCodeOption[] = [
  ...dialCodeGroups.filter((group) => group.dial === DEFAULT_DIAL_CODE).map(optionOf),
  ...dialCodeGroups.filter((group) => group.dial !== DEFAULT_DIAL_CODE).map(optionOf)
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN')),
]

/** 长代码优先匹配，避免将来出现 `+1` 与 `+1242` 并存时被短代码截断。 */
const dialCodesByLength = [...dialCodeGroups].sort((left, right) => right.dial.length - left.dial.length)

const digitsOnly = (value: string): string => value.replace(/[^0-9]/g, '')

/**
 * 把档案里的 E.164 拆成两段。无法识别国家代码时保留 `+` 开头的原始前缀，
 * 使未改动字段的保存不会悄悄改写用户已存号码。
 * @returns `dial` 始终非空；本地号码为空表示该字段未填写。
 */
export function splitPhone(value: string): { dial: string; national: string } {
  const text = value.trim()
  if (text === '') return { dial: DEFAULT_DIAL_CODE, national: '' }
  if (!text.startsWith('+')) return { dial: DEFAULT_DIAL_CODE, national: digitsOnly(text) }
  const known = dialCodesByLength.find((group) => text.startsWith(group.dial))
  if (known) return { dial: known.dial, national: digitsOnly(text.slice(known.dial.length)) }
  const unknown = /^\+[0-9]{1,4}/.exec(text)
  return unknown ? { dial: unknown[0], national: digitsOnly(text.slice(unknown[0].length)) } : { dial: DEFAULT_DIAL_CODE, national: digitsOnly(text) }
}

/** 本地号码为空即「未填写」（`null` 语义）；否则拼成 E.164，分隔符一律去掉。 */
export function composePhone(dial: string, national: string): string {
  const digits = digitsOnly(national)
  if (digits === '') return ''
  return `${dial || DEFAULT_DIAL_CODE}${digits}`
}

/**
 * 下拉框的搜索匹配：中文名、ISO 地区代码与国家代码数字都参与，
 * 输入「86」「中国」「cn」「hongkong」都能命中。
 */
export function matchesDialCode(query: string, option: DialCodeOption): boolean {
  const text = query.trim().toLowerCase()
  if (text === '') return true
  if (/^\+?[0-9]+$/.test(text)) return option.value.slice(1).startsWith(text.replace(/^\+/, ''))
  return option.names.some((name) => name.toLowerCase().includes(text))
    || option.regions.some((code) => code.toLowerCase() === text)
}
