import { isLooseKebabCase, isLooseCamelCase } from './stringCases'

test('isLooseKebabCase', () => {
  expect(isLooseKebabCase('abc')).toBe(true)
  expect(isLooseKebabCase('abc-def')).toBe(true)
  expect(isLooseKebabCase('abcDef')).toBe(false)
  expect(isLooseKebabCase('abc-Def')).toBe(false)
})

test('isLooseCamelCase', () => {
  expect(isLooseCamelCase('abc')).toBe(true)
  expect(isLooseCamelCase('abcDef')).toBe(true)
  expect(isLooseCamelCase('abc-def')).toBe(false)
  expect(isLooseCamelCase('abc-defGhi')).toBe(false)
})
