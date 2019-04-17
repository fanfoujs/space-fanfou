import bridge from './bridge'
import settings from './settings'

export default async function createPageEnvironment() {
  await settings.ready()

  return { bridge, settings }
}
