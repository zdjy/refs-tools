type DecodedImage = { width: number; height: number; close(): void }
export type ImageCompressionPorts = {
  decode(file: File): Promise<DecodedImage>
  encode(image: DecodedImage, width: number, height: number, quality: number): Promise<Blob | null>
  file(blob: Blob, name: string): File
}
const browserPorts: ImageCompressionPorts = {
  decode: (file) => createImageBitmap(file),
  async encode(image, width, height, quality) {
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.drawImage(image as ImageBitmap, 0, 0, width, height)
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  },
  file: (blob, name) => new File([blob], name, { type: 'image/jpeg' }),
}

/** 仅在浏览器生成独立 JPEG 预览（最长边 1600px、2 MiB），保留原文件；失败不回退到 API 压缩。 */
export async function compressPreview(original: File, ports: ImageCompressionPorts = browserPorts): Promise<File> {
  let image: DecodedImage | null = null
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(original.type)) throw new Error('format')
    image = await ports.decode(original)
    if (!Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width < 1 || image.height < 1
      || image.width * image.height > 80000000) throw new Error('dimensions')
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await ports.encode(image, width, height, quality)
      if (blob && blob.size > 0 && blob.size <= 2097152) return ports.file(blob, `${original.name.replace(/\.[^.]*$/, '')}-preview.jpg`)
    }
    throw new Error('size')
  } catch { throw new Error('无法生成预览。请重拍或降低相机分辨率；原文件未上传。') }
  finally { image?.close() }
}
