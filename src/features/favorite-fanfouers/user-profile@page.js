import { h, render, Component } from 'preact'
import select from 'select-dom'
import cx from 'classnames'
import { createFriendsListReader, createFriendsListWriter, createStorageChangeHandler } from './shared'
import { isUserProfilePage } from '@libs/pageDetect'
import preactRender from '@libs/preactRender'

const FAVED_TIP = '从有爱饭友列表去除'
const UNFAVED_TIP = '加入有爱饭友列表'

export default context => {
  const {
    requireModules,
    registerBroadcastListener,
    unregisterBroadcastListener,
    elementCollection,
  } = context
  const { storage } = requireModules([ 'storage' ])

  let unmount
  const readFriendsList = createFriendsListReader(storage)
  const writeFriendsList = createFriendsListWriter(storage)

  elementCollection.add({
    info: '#info',
  })

  function getUserId() {
    return decodeURIComponent(window.location.pathname.split('/')[1])
  }

  function findByUserId(userId) {
    return friendData => friendData.userId === userId
  }

  async function isFavorited() {
    const userId = getUserId()
    const friendsList = await readFriendsList()

    return friendsList.some(findByUserId(userId))
  }

  async function addToOrUpdateFriendsList() {
    const userId = getUserId()
    const friendsList = await readFriendsList()
    const existingIndex = friendsList.findIndex(findByUserId(userId))
    const friendData = {
      userId,
      nickname: select('#panel h1').textContent,
      avatarUrl: select('#avatar img').src.replace(/^https?:/, ''),
    }

    if (existingIndex === -1) {
      friendsList.push(friendData)
    } else {
      friendsList[existingIndex] = friendData
    }

    await writeFriendsList(friendsList)
  }

  async function removeFromFriendsList() {
    const userId = getUserId()
    const friendsList = await readFriendsList()
    const index = friendsList.findIndex(findByUserId(userId))

    friendsList.splice(index, 1)
    await writeFriendsList(friendsList)
  }

  class FavoriteFriend extends Component {
    constructor(...args) {
      super(...args)

      this.state = {
        isFavorited: false,
      }

      this.refreshState()
    }

    onStorageChange = createStorageChangeHandler(() => {
      this.refreshState()
    })

    async refreshState() {
      this.setState({
        isFavorited: await isFavorited(),
      })
    }

    toggleFavoritedStatus = async () => {
      // 操作时可能存储的状态相比于读取时已经发生变化，所以重新读取
      if (await isFavorited()) {
        await removeFromFriendsList()
      } else {
        await addToOrUpdateFriendsList()
      }

      await this.refreshState()
    }

    renderFavoritedStatusIndicator() {
      const id = 'sf-favorited-status-indicator'
      const className = cx({
        'sf-is-favorited': this.state.isFavorited,
      })

      render(
        <span id={id} className={className} />,
        this.favoritedStatusIndicator.parentElement,
        this.favoritedStatusIndicator,
      )
    }

    renderFavoritedStatusToggler() {
      const id = 'sf-favorited-status-toggler'
      const title = this.state.isFavorited
        ? FAVED_TIP
        : UNFAVED_TIP
      const className = cx({
        'sf-is-favorited': this.state.isFavorited,
      })

      render(
        <a id={id} className={className} title={title} onClick={this.toggleFavoritedStatus} />,
        this.favoritedStatusToggler.parentElement,
        this.favoritedStatusToggler,
      )
    }

    render() {
      this.renderFavoritedStatusIndicator()
      this.renderFavoritedStatusToggler()

      return null
    }

    componentDidMount() {
      this.favoritedStatusIndicator = document.createElement('span')
      this.favoritedStatusToggler = document.createElement('a')

      select('#avatar').append(this.favoritedStatusIndicator)
      select('#panel h1').append(this.favoritedStatusToggler)

      registerBroadcastListener(this.onStorageChange)
    }

    componentWillUnmount() {
      this.favoritedStatusIndicator.remove()
      this.favoritedStatusToggler.remove()

      this.favoritedStatusIndicator = this.favoritedStatusToggler = null

      unregisterBroadcastListener(this.onStorageChange)
    }
  }

  return {
    applyWhen: () => isUserProfilePage(),

    waitReady: () => elementCollection.ready('info'),

    async onLoad() {
      unmount = preactRender(<FavoriteFriend />)

      if (await isFavorited()) {
        addToOrUpdateFriendsList()
      }
    },

    onUnload() {
      unmount()
      unmount = null
    },
  }
}
