export default methods => {
  if (typeof SF === 'undefined') {
    window.SF = {}
  }

  Object.assign(window.SF, methods)
}
