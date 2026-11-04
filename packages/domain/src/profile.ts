/**
 * 裁判档案字段的纯校验。
 * 服务端在合并局部更新后调用一次，数据库 CHECK 约束只是兜底；
 * 行政区是否真实存在属于前端选择器与数据文件职责，这里只校验代码形态。
 */

export type ProfileFields = {
  nickname: string
  legalName: string | null
  phone: string | null
  regionCode: string | null
  regionLabel: string | null
  addressDetail: string | null
  birthDate: string | null
  avatarMediaId: string | null
}

export type ProfileValidationError =
  | 'INVALID_NICKNAME' | 'INVALID_LEGAL_NAME' | 'INVALID_PHONE' | 'INVALID_REGION'
  | 'INVALID_ADDRESS' | 'INVALID_BIRTH_DATE'

export const NICKNAME_MAX = 80
export const LEGAL_NAME_MAX = 40
export const REGION_LABEL_MAX = 120
export const ADDRESS_MAX = 200

/** 手机号采用 E.164；不发送短信验证码，因此长度上限按国际号码惯例取 15 位。 */
export const PHONE_PATTERN = /^\+[1-9][0-9]{7,14}$/
export const REGION_CODE_PATTERN = /^[0-9]{6}$/
export const BIRTH_DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

/** 去掉首尾空白，空字符串视为“未填写”，与数据库 NULL 语义对齐。 */
export function normalizeProfileText(value: string | null): string | null {
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * 按字段顺序返回第一个错误，便于前端聚焦到对应输入框。
 * @param today 当前日期（`YYYY-MM-DD`），用于拒绝未来生日；由调用方注入以保证可测试。
 */
export function validateProfile(fields: ProfileFields, today: string): ProfileValidationError | null {
  const nickname = normalizeProfileText(fields.nickname)
  if (nickname === null || [...nickname].length > NICKNAME_MAX) return 'INVALID_NICKNAME'
  const legalName = normalizeProfileText(fields.legalName)
  if (legalName !== null && [...legalName].length > LEGAL_NAME_MAX) return 'INVALID_LEGAL_NAME'
  // 空字符串在合并后等价于“未填写”，与数据库 NULL 语义一致。
  const phone = normalizeProfileText(fields.phone)
  if (phone !== null && !PHONE_PATTERN.test(phone)) return 'INVALID_PHONE'
  // 代码与展示名必须同时存在：只有代码无法展示，只有名称无法聚合。
  if ((fields.regionCode === null) !== (fields.regionLabel === null)) return 'INVALID_REGION'
  if (fields.regionCode !== null && !REGION_CODE_PATTERN.test(fields.regionCode)) return 'INVALID_REGION'
  const regionLabel = normalizeProfileText(fields.regionLabel)
  if (fields.regionCode !== null && (regionLabel === null || [...regionLabel].length > REGION_LABEL_MAX)) return 'INVALID_REGION'
  const address = normalizeProfileText(fields.addressDetail)
  if (address !== null && [...address].length > ADDRESS_MAX) return 'INVALID_ADDRESS'
  if (fields.birthDate !== null && !validBirthDate(fields.birthDate, today)) return 'INVALID_BIRTH_DATE'
  return null
}

/** 生日允许为空；填写时必须是不晚于今天、且不早于 1900-01-01 的真实日历日期。 */
function validBirthDate(value: string, today: string): boolean {
  if (!BIRTH_DATE_PATTERN.test(value) || !BIRTH_DATE_PATTERN.test(today)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false
  return value >= '1900-01-01' && value <= today
}
