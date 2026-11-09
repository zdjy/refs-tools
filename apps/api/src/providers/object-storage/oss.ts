import OSS from 'ali-oss'
import type { ObjectStorage } from '../../modules/media/media.types.js'

/** 官方 SDK 的薄适配；仅进行签名与元数据/删除请求，不提供媒体上传、下载或代理能力。 */
export function createOssStorage(env: NodeJS.ProcessEnv): { storage: ObjectStorage; bucket: string } {
  const bucket = env['OSS_BUCKET']
  const region = env['OSS_REGION']
  const accessKeyId = env['OSS_ACCESS_KEY_ID']
  const accessKeySecret = env['OSS_ACCESS_KEY_SECRET']
  if (!bucket || !region || !accessKeyId || !accessKeySecret) throw new Error('OSS_BUCKET, OSS_REGION and OSS access credentials are required')
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) || !/^oss-[a-z0-9-]+$/.test(region)) throw new Error('Invalid OSS bucket or region')
  const client = new OSS({ bucket, region, accessKeyId, accessKeySecret, secure: true, timeout: 5000, maxSockets: 4 } as OSS.Options)
  const expiresAt = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString()
  return { bucket, storage: {
    async signUpload(media, seconds) {
      const headers = { 'Content-Type': media.contentType, 'x-oss-forbid-overwrite': 'true',
        'x-oss-meta-media-id': media.id, 'x-oss-meta-owner-id': media.ownerUserId }
      const url = client.signatureUrl(media.objectKey, { expires: seconds, method: 'PUT', ...headers })
      return { method: 'PUT', url, headers, expiresAt: expiresAt(seconds) }
    },
    async stat(key) {
      try {
        const result = await client.head(key)
        const headers = result.res.headers as Record<string, string>
        return { sizeBytes: Number(headers['content-length']), contentType: headers['content-type'] ?? '',
          etag: headers['etag'] ?? '', mediaId: headers['x-oss-meta-media-id'] ?? '', ownerUserId: headers['x-oss-meta-owner-id'] ?? '' }
      } catch (error) {
        if ((error as { status?: number }).status === 404) return null
        throw error
      }
    },
    async signRead(media, seconds, disposition = 'attachment') {
      return { url: client.signatureUrl(media.objectKey, { expires: seconds, response: {
        'content-disposition': disposition, 'cache-control': 'no-store', 'content-type': media.contentType,
      } }), expiresAt: expiresAt(seconds) }
    },
    async delete(key) { await client.delete(key) },
  } }
}
