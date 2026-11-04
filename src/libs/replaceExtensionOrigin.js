import getExtensionOrigin from '@libs/getExtensionOrigin'
import { EXTENSION_ORIGIN_PLACEHOLDER_RE } from '@constants'

export default code => code
  .replace(EXTENSION_ORIGIN_PLACEHOLDER_RE, getExtensionOrigin())
  .replace(/url\((['"]?)(\/assets\/[^)'"\s]+)\1\)/g, (_, quote, path) =>
    `url(${quote}${getExtensionOrigin()}${path}${quote})`)
