// TODO: 这些值不应该写死
export const ORIGINAL_PHOTO_WIDTH_LIMIT = 596
export const RE_ORIGINAL_PHOTO_PARAMS = new RegExp(`@${ORIGINAL_PHOTO_WIDTH_LIMIT}w_1l\\.jpg$`)
export const THUMBNAIL_PHOTO_WIDTH_LIMIT = 120
export const THUMBNAIL_PHOTO_HEIGHT_LIMIT = 120
export const RE_THUMBNAIL_PHOTO_PARAMS = new RegExp(`@${THUMBNAIL_PHOTO_WIDTH_LIMIT}w_${THUMBNAIL_PHOTO_HEIGHT_LIMIT}h_1l\\.jpg$`)

// 在 metadata 中定义选项时，label 中可以使用这个占位符来表示控件的位置
// 比如 <input type="number" /> 可以出现在 label 文本中部
export const CONTROL_PLACEHOLDER = '<CONTROL_PLACEHOLDER>'

export const STORAGE_KEY_IS_EXTENSION_UPGRADED = 'is-extension-upgraded'
export const STORAGE_AREA_NAME_IS_EXTENSION_UPGRADED = 'session'
