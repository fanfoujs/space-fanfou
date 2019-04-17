import truncateFilename from './truncateFilename'

test('truncateFilename', () => {
  expect(truncateFilename('file.ext', 12)).toBe('file.ext')
  expect(truncateFilename('1234567890.ext', 12)).toBe('123...90.ext')
})
