export const MAX_COMPOSER_IMAGE_SIZE = 4 * 1024 * 1024
export const COMPOSER_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/x-ms-bmp',
]

export type ComposerImage = {
  id: string
  name: string
  dataUrl: string
}

export function validateComposerImageFile(file: Pick<File, 'type' | 'size'>) {
  if (!COMPOSER_IMAGE_TYPES.includes(file.type))
    throw new Error('请选择 JPG、PNG、GIF 或 BMP 图片。')
  if (!file.size) throw new Error('图片内容为空，请重新选择。')
  if (file.size > MAX_COMPOSER_IMAGE_SIZE)
    throw new Error('图片不能超过 4 MB，请选择较小的图片。')
}

// Extension messages and storage use JSON, so validate and rebuild the File in the worker.
export function parseComposerImage(value: unknown): File {
  if (!value || typeof value !== 'object')
    throw new Error('无法读取图片，请重新添加。')
  const image = value as ComposerImage
  if (
    typeof image.id !== 'string' ||
    !image.id ||
    typeof image.name !== 'string' ||
    typeof image.dataUrl !== 'string'
  )
    throw new Error('无法读取图片，请重新添加。')
  if (image.dataUrl.length > Math.ceil(MAX_COMPOSER_IMAGE_SIZE / 3) * 4 + 64)
    throw new Error('图片不能超过 4 MB，请选择较小的图片。')
  const match =
    /^data:(image\/(?:jpeg|png|gif|bmp|x-ms-bmp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      image.dataUrl,
    )
  if (!match) throw new Error('图片格式不支持，请重新添加。')
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = Uint8Array.from(atob(match[2]!), (character) =>
      character.charCodeAt(0),
    )
  } catch {
    throw new Error('图片数据损坏，请重新添加。')
  }
  const type = match[1]!
  validateComposerImageFile({ type, size: bytes.length })
  const header = (...values: number[]) =>
    values.every((byte, index) => bytes[index] === byte)
  const valid =
    type === 'image/png'
      ? header(137, 80, 78, 71, 13, 10, 26, 10)
      : type === 'image/jpeg'
        ? header(255, 216, 255)
        : type === 'image/gif'
          ? header(71, 73, 70, 56) &&
            (bytes[4] === 55 || bytes[4] === 57) &&
            bytes[5] === 97
          : header(66, 77)
  if (!valid) throw new Error('图片数据与格式不符，请重新添加。')
  return new File([bytes], image.name || 'image', { type })
}
