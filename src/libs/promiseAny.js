import isPromise from 'is-promise'

// 类似于 Array#some，总是 resolve 返回布尔值。
// 这里如果使用 async/await 的话，代码可以简单许多，但是要么只能串行执行，
// 要么用 Promsie.all() 并行执行但是必须等待所有都结束。
// 没有使用 p-any 的原因是，它在不达成条件的情况下会 reject/throw，我们这里则是 resolve(false)。
// 后者的好处是使用起来更方便，前者就只能用 try/catch 来判断。
// 而且 p-any 代码量明显大于下面这个实现。
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
