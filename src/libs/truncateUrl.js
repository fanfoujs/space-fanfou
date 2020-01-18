const URL_LENGTH_LIMIT = 30 // 和饭否保持一致
const URL_ELLIPSIS = '...'

export default url => {
  const originalLength = url.length

  if (originalLength > URL_LENGTH_LIMIT) url = (
    url.slice(0, URL_LENGTH_LIMIT - URL_ELLIPSIS.length) +
    URL_ELLIPSIS
  )

  return url
}
