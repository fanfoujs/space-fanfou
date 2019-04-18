import { h, Component } from 'preact'
import select from 'select-dom'
import Cookies from 'js-cookie'
import pick from 'just-pick'
import preactRender from '@libs/preactRender'
import { readJSONFromLocalStorage } from '@libs/localStorageWrappers'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray'
import arrayRemove from '@libs/arrayRemove'
import omitBy from '@libs/omitBy'

const STORAGE_KEY = 'user-switcher/allUserData'
const STORAGE_AREA_NAME = 'local'
const CLASSNAME_IS_READY = 'sf-is-ready'

export default context => {
  const { requireModules, elementCollection } = context
  const { storage } = requireModules([ 'storage' ])

  let unmountUserSwitcher

  elementCollection.add({
    usertop: '#user_top',
  })

  class UserSwitcher extends Component {
    constructor(...args) {
      super(...args)

      this.state = {
        isReady: false,
        allUserData: [],
      }

      this.loadData()
    }

    loadData = async () => {
      this.setState({
        isReady: true,
        allUserData: await readAllUserData(),
      })

      elementCollection.get('usertop').classList.add(CLASSNAME_IS_READY)
    }

    componentWillUnmount() {
      elementCollection.get('usertop').classList.remove(CLASSNAME_IS_READY)
    }

    async switchToUser(userId) {
      await writeUserCookies(userId)
      redirectToHomePage()
    }

    async removeUser(userId) {
      const userData = await getUserData(userId)
      const tip = `确定要从用户列表中删除 @${userData.nickname}（${userId}）吗？`

      // eslint-disable-next-line no-alert
      if (window.confirm(tip)) {
        await removeUser(userId)
        await this.loadData()
      }
    }

    renderItem(userData) {
      const currentUserId = getLoggedInUserId()
      const { userId, avatarUrl, nickname } = userData

      if (userId === currentUserId) return null

      return (
        <li key={`user-${userId}`} className="sf-user-item">
          <a class="sf-user-info" onClick={() => this.switchToUser(userId)}>
            <img src={avatarUrl} alt={nickname} />
            { nickname }
          </a>
          <span class="sf-del-icon" onClick={() => this.removeUser(userId)}>×</span>
        </li>
      )
    }

    renderAddNew() {
      return (
        <li key="add-new" class="sf-add-new-user">
          <input type="button" className="formbutton" onClick={addNewUser} value="登入另一个……" />
        </li>
      )
    }

    render() {
      const { isReady, allUserData } = this.state

      return isReady && (
        <ul id="sf-user-switcher">
          { allUserData.map(this.renderItem, this) }
          { this.renderAddNew() }
        </ul>
      )
    }
  }

  async function readAllUserData() {
    return await storage.read(STORAGE_KEY, STORAGE_AREA_NAME) || []
  }

  async function writeAllUserData(data) {
    await storage.write(STORAGE_KEY, data, STORAGE_AREA_NAME)
  }

  async function getUserData(userId, allUserData_) {
    const allUserData = allUserData_ || await readAllUserData()
    const userData = allUserData.find(item => item.userId === userId)

    return userData
  }

  async function writeUserCookies(userId) {
    const userData = await getUserData(userId)

    for (const [ key, value ] of Object.entries(userData.cookies)) {
      Cookies.set(key, value, {
        domain: '.fanfou.com',
        expires: 30, // 因为拿不到服务端给的 cookies 过期时间，直接写死为 30 天
      })
    }
  }

  // 把当前登录用户的信息保存到切换列表里，或者更新用户信息
  async function addOrUpdateCurrentUser() {
    const loggedInUserId = getLoggedInUserId()
    const allCookies = Cookies.get()
    const userData = {
      userId: loggedInUserId,
      nickname: select('#user_top h3').textContent,
      avatarUrl: select('#user_top img').src,
      cookies: omitBy(allCookies, (_, key) => (
        key.startsWith('_') || // 跳过键名以「_」开头的 cookie
        key === 'uuid' // 跳过键名为「uuid」的 cookie
      )),
    }

    await updateUserData(loggedInUserId, userData)
  }

  async function removeUser(userId) {
    await updateUserData(userId, null)
  }

  async function removeCurrentUser() {
    await removeUser(getLoggedInUserId())
  }

  async function updateUserData(userId, userData) {
    const allUserData = await readAllUserData()
    // 这里必须把 allUserData 传给 getUserData()，否则指针必然不相等
    const oldUserData = await getUserData(userId, allUserData)

    if (oldUserData) {
      arrayRemove(allUserData, oldUserData)
    }

    // 把当前登录的用户放置到列表头部
    if (userData) {
      allUserData.unshift(userData)
    }

    await writeAllUserData(allUserData)
  }

  function addNewUser() {
    removeSessionCookies()
    redirectToLoginPage()
  }

  // 不等于退出登录，因为不会注销服务器端的 session
  function removeSessionCookies() {
    [ 'u', 'm', 'al', 'PHPSESSID' ].forEach(key => {
      Cookies.remove(key, {
        domain: '.fanfou.com',
      })
    })
  }

  function redirectToLoginPage() {
    window.location.href = '/login'
  }

  function redirectToHomePage() {
    window.location.href = '/home'
  }

  function renderUserSwitcher() {
    const userTop = select('#user_top')

    unmountUserSwitcher = preactRender(<UserSwitcher />, userTop)
  }

  function getLogoutLink() {
    const navigationLinks = select.all('#navigation a')
    const logoutLink = findElementWithSpecifiedContentInArray(navigationLinks, '退出')

    return logoutLink
  }

  async function onLogoutClick() {
    const currentUserId = getLoggedInUserId()

    await removeUser(currentUserId)
  }

  function listenOnLogout() {
    const logoutLink = getLogoutLink()

    logoutLink.addEventListener('click', onLogoutClick)
  }

  function unlistenOnLogout() {
    const logoutLink = getLogoutLink()

    logoutLink.removeEventListener('click', onLogoutClick)
  }

  return {
    migrations: [ {
      migrationId: 'user-switcher/ls-to-chrome-storage-api-and-object-to-array',
      storageAreaName: 'local',
      async executor() {
        const oldData = readJSONFromLocalStorage('switcher')
        if (!oldData) return

        const newData = []
        for (const [ userId, userData ] of Object.entries(oldData)) {
          newData.push({
            userId,
            avatarUrl: userData.image,
            ...pick(userData, [ 'nickname', 'cookies' ]),
          })
        }

        await writeAllUserData(newData)
      },
    } ],

    applyWhen: () => elementCollection.ready('usertop'),

    async onLoad() {
      // 登录时若勾选了「保存到切换列表」（即原本的「自动登录」），则存在这个 cookie
      if (Cookies.get('al')) {
        await addOrUpdateCurrentUser()
      } else {
        await removeCurrentUser()
      }

      renderUserSwitcher()
      listenOnLogout()
    },

    onUnload() {
      unmountUserSwitcher()
      unlistenOnLogout()
    },
  }
}
