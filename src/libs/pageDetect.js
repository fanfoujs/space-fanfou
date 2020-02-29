import select from 'select-dom'
import simpleMemoize from 'just-once'
import elementReady from 'element-ready'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import getLoggedInUserProfilePageUrl from '@libs/getLoggedInUserProfilePageUrl'
import any from '@libs/promiseAny'
import every from '@libs/promiseEvery'
import neg from '@libs/neg'

// 这些函数可以是异步的，但是应该尽早返回结果，避免调用函数等待过久

// 是否为主 timeline 页面
export function isHomePage() {
  return window.location.pathname === '/home'
}

// 是否为登录页面
export function isLoginPage() {
  return (
    window.location.pathname === '/' ||
    window.location.pathname === '/login'
  )
}

// 是否为当前登录用户的个人页面（消息页面，不含收藏、相册等）
export function isLoggedInUserProfilePage() {
  const userId = getLoggedInUserId()

  return (
    userId &&
    window.location.pathname.split('/')[1] === userId
  )
}

// 是否为当前登录用户用户好友页面
export const isLoggedInUserFriendsListPage = simpleMemoize(async () => {
  if (!isFriendsListPage()) return false

  await elementReady('#stream')

  const urlA = select('.tabs .crumb').href
  const urlB = getLoggedInUserProfilePageUrl()

  return urlA === urlB
})

// 是否为当前登录用户用户粉丝页面
export const isLoggedInUserFollowersListPage = simpleMemoize(async () => {
  if (!isFollowersListPage()) return false

  await elementReady('#stream')

  const urlA = select('.tabs .crumb').href
  const urlB = getLoggedInUserProfilePageUrl()

  return urlA === urlB
})

// 是否为用户 timeline 页面
export const isUserProfilePage = simpleMemoize(() => {
  return any([
    // 只有用户个人页面中才存在「投诉」对话框
    elementReady('#overlay-report'),
    // 但是当前登录用户的个人页面中没有「投诉」对话框，需要额外判断
    isLoggedInUserProfilePage(),
  ])
})

// 是否为用户相册页面
export function isPhotoAlbumPage() {
  return window.location.pathname.startsWith('/album/')
}

// 是否为照片大图页面
export function isPhotoEntryPage() {
  return window.location.pathname.startsWith('/photo/')
}

// 是否为用户单消息页面
export function isStatusPage() {
  return window.location.pathname.startsWith('/statuses/')
}

// 是否为用户收藏页面
export function isFavoritesPage() {
  return window.location.pathname.startsWith('/favorites/')
}

// 是否为用户好友页面
export function isFriendsListPage() {
  return window.location.pathname.split('/')[1] === 'friends'
}

// 是否为用户粉丝页面
export function isFollowersListPage() {
  return window.location.pathname.split('/')[1] === 'followers'
}

// 是否为用户页面
export const isUserPage = simpleMemoize(() => any([
  isUserProfilePage(),
  isPhotoAlbumPage(),
  isPhotoEntryPage(),
  isFavoritesPage(),
  isFriendsListPage(),
  isFollowersListPage(),
]))

// 是否为当前登录用户页面
export const isLoggedInUserPage = simpleMemoize(() => {
  const userId = getLoggedInUserId()

  return any([
    isLoggedInUserProfilePage(),
    every([
      isUserPage(),
      // TODO: 照片大图页面判断有问题
      window.location.pathname.split('/')[2] === userId,
    ]),
  ])
})

// 是否为私信页面
export function isPrivateMessagePage() {
  return window.location.pathname.split('/')[1] === 'privatemsg'
}

// 是否为随便看看页面
export function isPublicTimelinePage() {
  return window.location.pathname === '/browse'
}

// 是否为管理关注请求页面（加锁时）
export function isFriendRequestPage() {
  return window.location.pathname === '/friend.request'
}

// 判断是否为 timeline 页面，例如首页、用户个人页面、随便看看页面等
export const isTimelinePage = simpleMemoize(() => every([
  // timeline 的页面都有 #stream 元素
  elementReady('#stream'),
  // 管理关注请求页面也有 #stream 元素，而且 DOM 结构和一般 timeline 页面难以区分，排除之
  neg(isFriendRequestPage()),
]))

export function isSharePage() {
  return [ '/sharer', '/sharer/image' ].includes(window.location.pathname)
}
