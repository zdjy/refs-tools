import { Agent } from 'node:https'
import { Agent as HttpAgent } from 'node:http'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ObjectStorage } from '../../modules/media/media.types.js'

function endpoint(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`)
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(`${name} must be an HTTP(S) origin without credentials or path`)
  }
  return url.origin
}

/** S3 兼容存储只签名或访问元数据；内外地址分别用于容器 IO 和浏览器直传，签名后不能替换 Host。 */
export function createS3Storage(env: NodeJS.ProcessEnv): { storage: ObjectStorage; bucket: string } {
  const bucket = env['S3_BUCKET']
  const region = env['S3_REGION']
  const accessKeyId = env['S3_ACCESS_KEY_ID']
  const secretAccessKey = env['S3_SECRET_ACCESS_KEY']
  if (!bucket || !region || !accessKeyId || !secretAccessKey) throw new Error('S3_BUCKET, S3_REGION and S3 access credentials are required')
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('Invalid S3 bucket')
  const options = { region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true, maxAttempts: 2,
    requestChecksumCalculation: 'WHEN_REQUIRED' as const,
    requestHandler: { connectionTimeout: 5000, requestTimeout: 5000,
      httpAgent: new HttpAgent({ maxSockets: 4 }), httpsAgent: new Agent({ maxSockets: 4 }) } }
  const client = new S3Client({ ...options, endpoint: endpoint(env['S3_ENDPOINT'], 'S3_ENDPOINT') })
  const signer = new S3Client({ ...options, endpoint: endpoint(env['S3_PUBLIC_ENDPOINT'], 'S3_PUBLIC_ENDPOINT') })
  const expiresAt = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString()
  return { bucket, storage: {
    async signUpload(media, seconds) {
      const headers = { 'Content-Type': media.contentType, 'If-None-Match': '*',
        'x-amz-meta-media-id': media.id, 'x-amz-meta-owner-id': media.ownerUserId }
      const command = new PutObjectCommand({ Bucket: bucket, Key: media.objectKey, ContentType: media.contentType,
        IfNoneMatch: '*', Metadata: { 'media-id': media.id, 'owner-id': media.ownerUserId } })
      const url = await getSignedUrl(signer, command, { expiresIn: seconds,
        signableHeaders: new Set(['content-type', 'if-none-match']),
        unhoistableHeaders: new Set(['x-amz-meta-media-id', 'x-amz-meta-owner-id']) })
      return { method: 'PUT', url, headers, expiresAt: expiresAt(seconds) }
    },
    async stat(key) {
      try {
        const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
        return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType ?? '', etag: result.ETag ?? '',
          mediaId: result.Metadata?.['media-id'] ?? '', ownerUserId: result.Metadata?.['owner-id'] ?? '' }
      } catch (error) {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null
        throw error
      }
    },
    async signRead(media, seconds) {
      const url = await getSignedUrl(signer, new GetObjectCommand({ Bucket: bucket, Key: media.objectKey,
        ResponseContentDisposition: 'attachment', ResponseCacheControl: 'no-store', ResponseContentType: media.contentType }), { expiresIn: seconds })
      return { url, expiresAt: expiresAt(seconds) }
    },
    async delete(key) { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })) },
  } }
}
