import getExtensionOrigin from '@libs/getExtensionOrigin'
import { EXTENSION_ORIGIN_PLACEHOLDER_RE } from '@constants'

export default code => {
  const extensionOrigin = getExtensionOrigin()
  const replacedCode = code.replace(EXTENSION_ORIGIN_PLACEHOLDER_RE, extensionOrigin)

  return replacedCode
}
