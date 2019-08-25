export default filename => {
  const index = filename.lastIndexOf('.')
  let basename, extname

  if (index === -1) {
    basename = filename
    extname = ''
  } else {
    basename = filename.substring(0, index)
    extname = filename.substring(index)
  }

  return { basename, extname }
}
