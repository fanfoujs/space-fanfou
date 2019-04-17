import isPromise from 'is-promise'

export default function neg(x) {
  return isPromise(x) ? x.then(neg) : !x
}
