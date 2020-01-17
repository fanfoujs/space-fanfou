/* eslint prefer-destructuring: 0 */

// String.prototype.indexOf() 不支持正则表达式
// 这个函数同时支持匹配字符串和正则表达式
export default (string, matcher, starting = 0) => {
  let index = -1
  let length = 0

  if (typeof matcher === 'string') {
    index = string.indexOf(matcher, starting)
    length = matcher.length
  } else {
    string = string.slice(starting)
    const matched = string.match(matcher)

    if (matched) {
      index = starting + matched.index
      length = matched[0].length
    }
  }

  return { index, length }
}
