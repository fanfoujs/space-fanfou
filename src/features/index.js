import { createRegistry } from './registry'

export const metadataModules = import.meta.glob('./*/metadata.js', { eager: true })
export default createRegistry(metadataModules)
