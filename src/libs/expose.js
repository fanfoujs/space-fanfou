export default object => {
  if (typeof SF === 'undefined') {
    window.SF = {}
  }

  Object.assign(window.SF, object)
}
