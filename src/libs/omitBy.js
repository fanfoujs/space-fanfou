export default (object, predicate) => {
  const ret = {}

  for (const [ k, v ] of Object.entries(object)) {
    if (!predicate(v, k)) ret[k] = v
  }

  return ret
}
