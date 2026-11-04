import getExtensionOrigin from '@libs/getExtensionOrigin'
import Tribute from 'tributejs'
import triggerEvent from 'compat-trigger-event'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import unknownUserAvatar_ from '@assets/images/unknown-user.jpg'
import { menuItemTemplate, noMatchTemplate } from './templates'

const STORAGE_KEY = 'friends-list'
const STORAGE_AREA_NAME = 'session'
const EXPIRES = 5 * 60 * 1000

export default context => {
  const { requireModules, elementCollection, registerDOMEventListener } = context
  const { storage } = requireModules([ 'storage' ])

  const unknownUserAvatar = new URL(unknownUserAvatar_, getExtensionOrigin()).href
  let tribute

  elementCollection.add({
    textarea: '#phupdate textarea',
  })

  registerDOMEventListener('textarea', 'tribute-replaced', onReplaced)

  function getStorageKeyForCurrentUser() {
    return STORAGE_KEY + '/' + getLoggedInUserId()
  }

  async function readFriendsListFromCache() {
    const { timestamp, friendsList } = await storage.read(
      getStorageKeyForCurrentUser(),
      STORAGE_AREA_NAME,
    ) || {}
    const now = Date.now()

    return timestamp && timestamp - now < EXPIRES
      ? friendsList
      : null
  }

  async function writeFriendsListToCache(friendsList) {
    const timestamp = Date.now()

    await storage.write(
      getStorageKeyForCurrentUser(),
      { timestamp, friendsList },
      STORAGE_AREA_NAME,
    )
  }

  async function fetchFriendsList() {
    const response = await fetch('/home.ac_friends')
    const json = await response.json()

    await writeFriendsListToCache(json)

    return json
  }

  function onReplaced() {
    const { textarea } = elementCollection.getAll()

    // 更新统计字数
    triggerEvent(textarea, 'change')
  }

  return {
    applyWhen: () => elementCollection.ready('textarea'),

    async onLoad() {
      tribute = new Tribute({
        values: await readFriendsListFromCache() || await fetchFriendsList(),
        lookup: 'label',
        fillAttr: 'realname',
        menuItemTemplate,
        noMatchTemplate: () => noMatchTemplate(unknownUserAvatar),
        searchOpts: {
          pre: '<strong>',
          post: '</strong>',
        },
        menuItemLimit: 7,
      })

      tribute.attach(elementCollection.get('textarea'))
    },

    onUnload() {
      tribute.detach(elementCollection.get('textarea'))
      tribute = null
    },
  }
}
