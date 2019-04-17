import neg from './neg'

test('neg', () => {
  expect(neg(true)).toBe(false)
  expect(neg(Promise.resolve(false))).resolves.toBe(true)
})
