import 'object.fromentries/auto'
import parseQueryString from './parseQueryString'

test('parseQueryString', () => {
  expect(parseQueryString('foo=bar')).toEqual({
    foo: 'bar',
  })
  // window.location.search 会返回 '?' 开头的字符串，也应该可以正确处理
  expect(parseQueryString('?foo=bar')).toEqual({
    foo: 'bar',
  })
  expect(parseQueryString('value=%E4%B8%AD%E6%96%87')).toEqual({
    value: '中文',
  })
})
