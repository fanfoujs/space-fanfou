import memoize from './memoize'

test('no parameter', () => {
  expect(() => {
    memoize(() => 0)
  }).toThrowError(/^fn 必须有且只有一个参数$/)
})

test('two parameters', () => {
  expect(() => {
    memoize((a, b) => a + b)
  }).toThrowError(/^fn 必须有且只有一个参数$/)
})

test('memoize', () => {
  const generateTimestamp = type => {
    switch (type) {
    case 'now':
      return +new Date()
    default:
      return 0
    }
  }
  const memoizedGenerateTimestamp = memoize(generateTimestamp)
  const expected = memoizedGenerateTimestamp('now')
  expect(memoizedGenerateTimestamp('now')).toBe(expected)

  memoizedGenerateTimestamp.delete('now')
  setTimeout(() => {
    expect(memoizedGenerateTimestamp('now')).not.toBe(expected)
  }, 1)
})
