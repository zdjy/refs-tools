import { describe, expect, it } from 'vitest'
import { createGb2312Codec } from '../src/gb2312.js'

const codec = createGb2312Codec(new TextDecoder('gb2312', { fatal: true }))

describe('GB 2312 区位码领域规则', () => {
  it('支持汉字到区位码、国标码和机内码的双向往返', () => {
    const result = codec.lookupCharacter('中')
    expect(result.status).toBe('gb2312')
    expect(result.fields).toMatchObject({ zoneCode: '5448', nationalCode: '5650', machineCode: 'D6D0' })
    expect(codec.lookupCode('5448')).toMatchObject({ status: 'gb2312', character: '中', fields: result.fields })
  })

  it('识别 ASCII，并与汉字区位码分开处理', () => {
    expect(codec.lookupCharacter('A')).toMatchObject({ status: 'ascii', asciiCode: 65, asciiHex: '41' })
    expect(codec.lookupCharacter(' ')).toMatchObject({ status: 'ascii', asciiCode: 32, asciiHex: '20' })
  })

  it('拒绝多字符、非法区位码和 GB 2312 未收录字符', () => {
    expect(codec.lookupCharacter('中国')).toMatchObject({ status: 'invalid', reason: 'multiple-characters' })
    expect(codec.lookupCode('0000')).toMatchObject({ status: 'invalid', reason: 'invalid-code' })
    expect(codec.lookupCode('544')).toMatchObject({ status: 'invalid', reason: 'invalid-code' })
    expect(codec.lookupCharacter('😀')).toMatchObject({ status: 'unsupported', reason: 'not-in-gb2312' })
  })

  it('批量转换保留顺序并统计 ASCII、汉字和不支持字符', () => {
    const result = codec.convertText('中A😀')
    expect(result.items.map((item) => item.status)).toEqual(['gb2312', 'ascii', 'unsupported'])
    expect(result).toMatchObject({ gb2312Count: 1, asciiCount: 1, unsupportedCount: 1 })
  })
})
