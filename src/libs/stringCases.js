import casey from 'casey-js'

// casy.isKebabCase('test') 会返回 fasle，使用下面的办法避开该问题

export function isLooseKebabCase(string) {
  return casey.isKebabCase(string) || casey.isLowerCase(string)
}

export function isLooseCamelCase(string) {
  return casey.isCamelCase(string) || (casey.isLowerCase(string) && !casey.isKebabCase(string))
}
