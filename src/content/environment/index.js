import messaging from './messaging'
import bridge from './bridge'
import settings from './settings'
import injectScript from './injectScript'
import injectMainStyle from './injectMainStyle'

export default async function createContentEnvironment() {
  messaging.ready()
  bridge.ready()
  injectScript()
  injectMainStyle()
  await settings.ready()

  return { messaging, settings }
}
