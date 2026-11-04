import { describe, expect, it } from 'vitest'
import { validateMediaPolicy } from '../src/media-policy.js'

describe('媒体上传策略', () => {
  it('预览图恰好 2 MiB 可上传，多一个字节拒绝；原图必须显式选择', () => {
    expect(validateMediaPolicy({ purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 2097152 })).toBeNull()
    expect(validateMediaPolicy({ purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 2097153 })).toBe('MEDIA_TOO_LARGE')
    expect(validateMediaPolicy({ purpose: 'certification_evidence', contentType: 'image/jpeg', sizeBytes: 20971520, imageKind: 'original' })).toBeNull()
  })

  it('按用途限制格式，扩展名不可伪装，所有大小必须是正整数字节', () => {
    expect(validateMediaPolicy({ purpose: 'exam_answer', contentType: 'application/pdf', sizeBytes: 100 })).toBe('MEDIA_TYPE_NOT_ALLOWED')
    expect(validateMediaPolicy({ purpose: 'forum_attachment', contentType: 'image/svg+xml', sizeBytes: 100 })).toBe('MEDIA_TYPE_NOT_ALLOWED')
    expect(validateMediaPolicy({ purpose: 'learning', contentType: 'image/jpeg', sizeBytes: 100, fileName: 'payload.exe' })).toBe('MEDIA_EXTENSION_MISMATCH')
    for (const sizeBytes of [0, -1, 0.5, NaN, Infinity]) {
      expect(validateMediaPolicy({ purpose: 'forum_attachment', contentType: 'image/png', sizeBytes })).toBe('INVALID_MEDIA_SIZE')
    }
    expect(validateMediaPolicy({ purpose: 'learning', contentType: 'video/mp4', sizeBytes: 524288000 })).toBeNull()
    expect(validateMediaPolicy({ purpose: 'learning', contentType: 'video/mp4', sizeBytes: 524288001 })).toBe('MEDIA_TOO_LARGE')
  })
})
