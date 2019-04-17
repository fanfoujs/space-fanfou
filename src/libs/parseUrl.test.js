import 'object.fromentries/auto'
import parseUrl from './parseUrl'

test('parseUrl', () => {
  expect(parseUrl('https://domain.com/path?foo=bar#hash')).toEqual({
    protocol: 'https:',
    origin: 'https://domain.com',
    domain: 'domain.com',
    pathname: '/path',
    query: {
      foo: 'bar',
    },
    hash: 'hash',
  })
})
