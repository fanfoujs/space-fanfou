export default filename => {
  const index = filename.lastIndexOf('.')
  let basename, extname

  if (index === -1) {
    basename = filename
    extname = ''
  } else {
    basename = filename.slice(0, index)
    extname = filename.slice(index)
  }

  return { basename, extname }
}
