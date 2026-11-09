import { describe, expect, it } from 'vitest'
import {
  composePhone, DEFAULT_DIAL_CODE, dialCodeOptions, matchesDialCode, splitPhone,
} from '../src/domain/phone'

const optionOf = (dial: string) => dialCodeOptions.find((option) => option.value === dial)!

describe('手机号区号拆分与合并', () => {
  it('把 E.164 拆成国家代码与本地号码，并去掉分隔符', () => {
    expect(splitPhone('+8613800138000')).toEqual({ dial: '+86', national: '13800138000' })
    expect(splitPhone('+1 202 555 0143')).toEqual({ dial: '+1', national: '2025550143' })
    expect(splitPhone('+7 (926) 123-45-67')).toEqual({ dial: '+7', national: '9261234567' })
  })

  it('未填写时回落到默认区号与空本地号码', () => {
    expect(splitPhone('')).toEqual({ dial: DEFAULT_DIAL_CODE, national: '' })
    expect(splitPhone('   ')).toEqual({ dial: DEFAULT_DIAL_CODE, national: '' })
  })

  it('无法识别的国家代码保留原始前缀，不改写已存号码', () => {
    const unknown = splitPhone('+999123456')
    expect(unknown).toEqual({ dial: '+9991', national: '23456' })
    expect(composePhone(unknown.dial, unknown.national)).toBe('+999123456')
  })

  it('本地号码为空即未填写，否则拼成不含分隔符的 E.164', () => {
    expect(composePhone('+86', '')).toBe('')
    expect(composePhone('+86', '138 0013 8000')).toBe('+8613800138000')
    expect(composePhone('', '13800138000')).toBe('+8613800138000')
  })

  it('拆分与合并互为逆运算', () => {
    for (const phone of ['+8613800138000', '+12025550143', '+819012345678']) {
      const { dial, national } = splitPhone(phone)
      expect(composePhone(dial, national)).toBe(phone)
    }
  })
})

describe('国家/地区代码下拉选项', () => {
  it('代码唯一且都带加号，默认区号排在首位', () => {
    const values = dialCodeOptions.map((option) => option.value)
    expect(new Set(values).size).toBe(values.length)
    expect(values.every((value) => /^\+[0-9]{1,4}$/.test(value))).toBe(true)
    expect(values[0]).toBe(DEFAULT_DIAL_CODE)
  })

  it('展示中文地区名，多地区共用代码时给出数量并保留全部名称供搜索', () => {
    // 地区中文名由运行时的 Intl.DisplayNames 提供，不同 ICU 版本措辞可能不同，只断言可识别的部分。
    expect(optionOf('+86').label).toBe('中国 +86')
    expect(optionOf('+852').label).toContain('香港')
    expect(optionOf('+852').label.endsWith(' +852')).toBe(true)
    const shared = optionOf('+1')
    expect(shared.label).toContain('等')
    expect(shared.label.endsWith(' +1')).toBe(true)
    expect(shared.names).toContain('加拿大')
    expect(shared.regions.length).toBeGreaterThan(1)
  })

  it('搜索匹配国家代码数字、中文名与 ISO 地区代码', () => {
    expect(matchesDialCode('86', optionOf('+86'))).toBe(true)
    expect(matchesDialCode('+86', optionOf('+86'))).toBe(true)
    expect(matchesDialCode('中国', optionOf('+86'))).toBe(true)
    expect(matchesDialCode('cn', optionOf('+86'))).toBe(true)
    expect(matchesDialCode('加拿大', optionOf('+1'))).toBe(true)
    expect(matchesDialCode('ca', optionOf('+1'))).toBe(true)
    expect(matchesDialCode('中国', optionOf('+1'))).toBe(false)
    expect(matchesDialCode('', optionOf('+1'))).toBe(true)
  })
})
