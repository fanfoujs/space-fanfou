import { createRegistry } from './registry'
import { metadataModules } from './index'

export default createRegistry(metadataModules,
  import.meta.glob('./*/*@background.{js,jsx}', { eager: true }),
)
