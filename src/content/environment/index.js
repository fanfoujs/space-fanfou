import messaging from './messaging'
import bridge from './bridge'
import settings from './settings'
import injectScript from './injectScript'
import notification from '@content/modules/notification'
import injectMainStyle from './injectMainStyle'

export default async function createContentEnvironment() {
  await messaging.ready()
  await bridge.ready()
  injectScript().catch(console.error)
  injectMainStyle()
  await settings.ready()
  messaging.registerBroadcastListener(async ({ action, payload }) => {
    if (action === 'NOTIFICATION_FALLBACK') {
      await notification.ready()
      notification.create(notification.INFO, payload.message)
    }
  })

  return { messaging, settings }
}
