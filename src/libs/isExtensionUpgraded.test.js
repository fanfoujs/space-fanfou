import isExtensionUpgraded from './isExtensionUpgraded'

test('isExtensionUpgraded', () => {
  expect(isExtensionUpgraded(null, '1.0.0')).toBe(false)
  expect(isExtensionUpgraded('0.9.8.9', '1.0.0')).toBe(true)
  expect(isExtensionUpgraded('1.0.0', '1.0.0')).toBe(false)
  expect(isExtensionUpgraded('1.0.0', '1.0.1')).toBe(true)
})
