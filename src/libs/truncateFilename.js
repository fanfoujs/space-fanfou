import stringWidth from 'string-width'
import parseFilename from '@libs/parseFilename'

const FILENAME_ELLIPSIS = '...'

export default (filename, toWidth) => {
  const originalWidth = stringWidth(filename)

  if (originalWidth <= toWidth) {
    return filename
  }

  const { basename, extname } = parseFilename(filename)
  const splitBasename = basename.split('')
  let head = '', tail = extname
  let ticktock = 1

  while (stringWidth(head + FILENAME_ELLIPSIS + tail) < toWidth) {
    if (ticktock) {
      head += splitBasename.shift()
    } else {
      tail = splitBasename.pop() + tail
    }

    ticktock = (ticktock + 1) % 2
  }

  return head + FILENAME_ELLIPSIS + tail
}
