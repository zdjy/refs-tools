import type { UploadIntentBody } from '@refs-tools/contracts/media'

const formats: Record<string, { extensions: string[]; limit: number }> = {
  'image/jpeg': { extensions: ['jpg', 'jpeg'], limit: 2097152 },
  'image/png': { extensions: ['png'], limit: 2097152 },
  'image/webp': { extensions: ['webp'], limit: 2097152 },
  'application/pdf': { extensions: ['pdf'], limit: 20971520 },
  'audio/mpeg': { extensions: ['mp3'], limit: 52428800 },
  'audio/mp4': { extensions: ['m4a'], limit: 52428800 },
  'video/mp4': { extensions: ['mp4'], limit: 524288000 },
  'video/webm': { extensions: ['webm'], limit: 524288000 },
}
export type MediaPolicyError = 'MEDIA_TYPE_NOT_ALLOWED' | 'MEDIA_TOO_LARGE' | 'INVALID_MEDIA_SIZE' | 'MEDIA_EXTENSION_MISMATCH'

/** 使用 MVP-001 §5.3 默认上限；sizeBytes 单位为字节，图片缺省按预览图，不自动允许原图。 */
export function validateMediaPolicy(input: UploadIntentBody): MediaPolicyError | null {
  const format = formats[input.contentType]
  const image = input.contentType.startsWith('image/')
  if (!format || (['exam_answer', 'post_game_record', 'avatar'].includes(input.purpose) && !image)
    || (input.purpose === 'certification_evidence' && !image && input.contentType !== 'application/pdf')
    || (input.imageKind && !image)) return 'MEDIA_TYPE_NOT_ALLOWED'
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 1) return 'INVALID_MEDIA_SIZE'
  const limit = image && input.imageKind === 'original' ? 20971520 : format.limit
  if (input.sizeBytes > limit) return 'MEDIA_TOO_LARGE'
  if (input.fileName && !format.extensions.includes(input.fileName.split('.').at(-1)?.toLowerCase() ?? '')) return 'MEDIA_EXTENSION_MISMATCH'
  return null
}
