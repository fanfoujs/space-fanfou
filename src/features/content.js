import { createRegistry } from './registry'
import { metadataModules } from './index'

export default createRegistry(metadataModules,
  import.meta.glob('./*/*@content.{js,jsx}', { eager: true }),
  import.meta.glob('./*/*@content.{less,css}', { eager: true, query: '?inline', import: 'default' }),
)
