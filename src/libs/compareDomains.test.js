import compareDomains from './compareDomains'

test('compareDomains', () => {
  expect(compareDomains('x.com', 'x.com')).toBe(true)
  expect(compareDomains('a.x.com', 'x.com')).toBe(true)
  expect(compareDomains('x.com', 'y.com')).toBe(false)
  expect(compareDomains('x.com', 'a.x.com')).toBe(false)
})
