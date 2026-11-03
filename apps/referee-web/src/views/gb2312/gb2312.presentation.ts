import type { Gb2312CharacterResult, Gb2312LookupStatus, Gb2312Reason } from '@refs-tools/domain'

export const statusLabels: Record<Gb2312LookupStatus, string> = {
  gb2312: 'GB 2312 汉字',
  ascii: 'ASCII 字符',
  unsupported: '未收录',
  invalid: '输入无效',
}

export const reasonLabels: Record<Gb2312Reason, string> = {
  'multiple-characters': '请输入单个字符。',
  'invalid-code': '区位码应为 4 位数字，且行列需在 GB 2312 范围内。',
  'not-in-gb2312': '该字符不在 GB 2312 收录范围内。',
}

export function resultMessage(result: Gb2312CharacterResult): string {
  return result.reason ? reasonLabels[result.reason] : statusLabels[result.status]
}

export function resultTone(result: Gb2312CharacterResult): 'positive' | 'warning' | 'negative' | 'neutral' {
  if (result.status === 'gb2312') return 'positive'
  if (result.status === 'ascii') return 'neutral'
  if (result.status === 'unsupported') return 'warning'
  return 'negative'
}
