import { describe, expect, it } from 'vitest'
import { normalizeProfileText, validateProfile, type ProfileFields } from '../src/profile.js'

const base: ProfileFields = {
  nickname: '裁判甲', legalName: null, phone: null, regionCode: null, regionLabel: null,
  addressDetail: null, birthDate: null, avatarMediaId: null,
}
const today = '2026-11-02'

describe('裁判档案字段校验', () => {
  it('昵称去空白后必须在 1-80 字符内', () => {
    expect(validateProfile({ ...base, nickname: '  裁判甲  ' }, today)).toBeNull()
    expect(validateProfile({ ...base, nickname: '   ' }, today)).toBe('INVALID_NICKNAME')
    expect(validateProfile({ ...base, nickname: 'x'.repeat(81) }, today)).toBe('INVALID_NICKNAME')
    expect(validateProfile({ ...base, nickname: '裁'.repeat(80) }, today)).toBeNull()
  })

  it('手机号只接受 E.164，未填写保持为空', () => {
    expect(validateProfile({ ...base, phone: '+8613800138000' }, today)).toBeNull()
    expect(validateProfile({ ...base, phone: '13800138000' }, today)).toBe('INVALID_PHONE')
    expect(validateProfile({ ...base, phone: '+8613800138000123456' }, today)).toBe('INVALID_PHONE')
    expect(validateProfile({ ...base, phone: null }, today)).toBeNull()
    expect(validateProfile({ ...base, phone: '' }, today)).toBeNull()
  })

  it('行政区代码与展示名必须成对出现且格式正确', () => {
    expect(validateProfile({ ...base, regionCode: '310104', regionLabel: '上海市/上海市/徐汇区' }, today)).toBeNull()
    expect(validateProfile({ ...base, regionCode: '310104', regionLabel: null }, today)).toBe('INVALID_REGION')
    expect(validateProfile({ ...base, regionCode: null, regionLabel: '上海市' }, today)).toBe('INVALID_REGION')
    expect(validateProfile({ ...base, regionCode: '3101', regionLabel: '上海市' }, today)).toBe('INVALID_REGION')
    expect(validateProfile({ ...base, regionCode: '310104', regionLabel: '   ' }, today)).toBe('INVALID_REGION')
  })

  it('生日可选，但必须是不晚于今天的真实日期且不早于 1900-01-01', () => {
    expect(validateProfile({ ...base, birthDate: '1990-02-28' }, today)).toBeNull()
    expect(validateProfile({ ...base, birthDate: '1900-01-01' }, today)).toBeNull()
    expect(validateProfile({ ...base, birthDate: '2026-11-03' }, today)).toBe('INVALID_BIRTH_DATE')
    expect(validateProfile({ ...base, birthDate: '1899-12-31' }, today)).toBe('INVALID_BIRTH_DATE')
    expect(validateProfile({ ...base, birthDate: '1990-02-30' }, today)).toBe('INVALID_BIRTH_DATE')
    expect(validateProfile({ ...base, birthDate: '1990-2-3' }, today)).toBe('INVALID_BIRTH_DATE')
  })

  it('详细地址与真实姓名会先去掉首尾空白，空串归一为清空', () => {
    expect(normalizeProfileText('  ')).toBeNull()
    expect(normalizeProfileText(' 张三 ')).toBe('张三')
    expect(validateProfile({ ...base, legalName: '  ', addressDetail: '  ' }, today)).toBeNull()
    expect(validateProfile({ ...base, addressDetail: 'x'.repeat(201) }, today)).toBe('INVALID_ADDRESS')
    expect(validateProfile({ ...base, legalName: 'x'.repeat(41) }, today)).toBe('INVALID_LEGAL_NAME')
  })
})
