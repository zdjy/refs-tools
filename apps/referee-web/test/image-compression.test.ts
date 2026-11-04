import { expect, it } from 'vitest'
import { compressPreview } from '../src/features/media/image-compression.js'

it('超大原图仍可生成独立预览，原图不被覆盖，解码失败明确报错', async () => {
  const original = { name: 'camera.jpg', type: 'image/jpeg', size: 30000000 } as File
  const preview = await compressPreview(original, {
    async decode() { return { width: 6000, height: 4000, close() {} } },
    async encode(_image, width, height) { expect([width, height]).toEqual([1600, 1067]); return new Blob(['preview'], { type: 'image/jpeg' }) },
    file: (blob, name) => Object.assign(blob, { name }) as File,
  })
  expect(preview.name).toBe('camera-preview.jpg')
  expect(original.name).toBe('camera.jpg')
  await expect(compressPreview(original, { async decode() { throw new Error('decode') }, async encode() { return null }, file: () => original })).rejects.toThrow('无法生成预览')
})
