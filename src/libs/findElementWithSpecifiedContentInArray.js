export default (array, search) => array.find(element => {
  if (typeof search === 'string') {
    return element.textContent.trim() === search
  } else if (search instanceof RegExp) {
    return search.test(element.textContent)
  }

  throw new Error('search 必须为字符串或正则表达式')
})
