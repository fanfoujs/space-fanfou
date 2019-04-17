import isPromise from 'is-promise'

// 类似于 Array.prototype.some()，总是 resolve 返回布尔值
export default iterable => {
  return new Promise(resolve => {
    const total = iterable.length
    let count = 0
    let done = false

    if (total === 0) {
      return resolve(false)
    }

    function check(value) {
      if (done) {
        return
      }

      if (value) {
        done = true
        resolve(true)
      } else {
        fail()
      }
    }

    function fail() {
      if (done) {
        return
      }

      if (++count === total) {
        done = true
        resolve(false)
      }
    }

    for (const item of iterable) {
      if (done) {
        return
      }

      if (isPromise(item)) {
        item.then(check, fail)
      } else {
        check(item)
      }
    }
  })
}
