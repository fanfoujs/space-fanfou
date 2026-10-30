import { createRegistry } from './registry'
import { metadataModules } from './index'

export default createRegistry(metadataModules,
  import.meta.glob('./*/*@page.{js,jsx}', { eager: true }),
  import.meta.glob('./*/*@page.{less,css}', { eager: true, query: '?inline', import: 'default' }),
)
