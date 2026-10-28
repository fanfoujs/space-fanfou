export default fn => {
  const cache = {}

  if (fn.length !== 1) {
    throw new Error('fn 必须有且只有一个参数')
  }

  const memoized = arg => {
    if (!Object.hasOwn(cache, arg)) {
      cache[arg] = fn(arg)
    }

    return cache[arg]
  }

  memoized.delete = arg => {
    delete cache[arg]
  }

  return memoized
}
