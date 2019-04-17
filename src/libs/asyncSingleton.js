export default fn => {
  let promise

  return (...args) => {
    if (!promise) {
      promise = fn(...args).finally(() => {
        promise = null
      })
    }

    return promise
  }
}
