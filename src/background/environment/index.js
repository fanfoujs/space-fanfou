import messaging from './messaging'
import storage from './storage'
import settings from './settings'
import proxiedFetch from './proxiedFetch'
import proxiedAudio from './proxiedAudio'
import proxiedCreateTab from './proxiedCreateTab'

export default async function createBackgroundEnvironment() {
  require('webext-inject-on-install')

  await Promise.all([
    messaging.install(),
    storage.install(),
    settings.install(),
    proxiedFetch.install(),
    proxiedAudio.install(),
    proxiedCreateTab.install(),
  ])

  return { messaging, settings }
}
