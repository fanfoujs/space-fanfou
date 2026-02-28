let attachment = null

function assertFile(file) {
  if (!(file instanceof File)) {
    throw new TypeError('[SpaceFanfou] attachmentStore expects a File instance')
  }
}

export function setAttachment({ file, filename = file?.name || '', source = 'unknown' }) {
  assertFile(file)
  attachment = { file, filename, source }
}

export function getAttachment() {
  return attachment
}

export function hasAttachment() {
  return !!attachment
}

export function clearAttachment() {
  attachment = null
}

export default {
  setAttachment,
  getAttachment,
  hasAttachment,
  clearAttachment,
}
