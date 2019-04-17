import isPromise from 'is-promise'

// 类似于 Array.prototype.every()，总是 resolve 返回布尔值
export default iterable => {
  return new Promise(resolve => {
    const total = iterable.length
    let count = 0
    let done = false

    if (total === 0) {
      return resolve(true)
    }

    function check(value) {
      if (!value) {
        return fail()
      }

      if (++count === total) {
        done = true
        resolve(true)
      }
    }

    function fail() {
      done = true
      resolve(false)
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
