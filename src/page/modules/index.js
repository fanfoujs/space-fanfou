import contentModules from '@content/modules'
import checkMyNewStatus from './checkMyNewStatus'
import fanfouOAuth from './fanfouOAuth'
import proxiedAudio from './proxiedAudio'
import proxiedCreateTab from './proxiedCreateTab'
import proxiedFetch from './proxiedFetch'
import storage from './storage'

export default { ...contentModules, 'checkMyNewStatus': checkMyNewStatus, 'fanfouOAuth': fanfouOAuth, 'proxiedAudio': proxiedAudio, 'proxiedCreateTab': proxiedCreateTab, 'proxiedFetch': proxiedFetch, 'storage': storage }
