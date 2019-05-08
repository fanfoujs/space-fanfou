import { STORAGE_CHANGED } from '@constants'

const STORAGE_KEY_FRIENDS_DATA = 'favorite-fanfouers/friendsData'
const STORAGE_AREA_FRIENDS_DATA = 'sync'

const createDefaultData = () => [ {
  userId: 'fanfou',
  nickname: '饭否',
  avatarUrl: '//s3.meituan.net/v1/mss_3d027b52ec5a4d589e68050845611e68/avatar/l0/00/37/9g.jpg?1181650871',
} ]

export const createFriendsListReader = storage => async () => {
  return await storage.read(STORAGE_KEY_FRIENDS_DATA, STORAGE_AREA_FRIENDS_DATA) || createDefaultData()
}

export const createFriendsListWriter = storage => async data => {
  await storage.write(STORAGE_KEY_FRIENDS_DATA, data, STORAGE_AREA_FRIENDS_DATA)
}

export const createStorageChangeHandler = callback => message => {
  if (message.action === STORAGE_CHANGED) {
    callback(message.payload)
  }
}
