import isLegacyVersion from './isLegacyVersion'

test('isLegacyVersion', () => {
  expect(isLegacyVersion('0.9.8.9')).toBe(true)
  expect(isLegacyVersion('1.0.0')).toBe(false)
})
