import { h, Component } from 'preact'
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc'
import cx from 'classnames'
import sleep from 'p-sleep'
import arrayMove from 'array-move'
import { createFriendsListReader, createFriendsListWriter, createStorageChangeHandler } from './shared'
import Tooltip from '@libs/Tooltip'
import { isHomePage } from '@libs/pageDetect'
import { fadeOut } from '@libs/fade'
import preactRender from '@libs/preactRender'
import { readJSONFromLocalStorage } from '@libs/localStorageWrappers'
import arrayRemove from '@libs/arrayRemove'

const USER_GUIDE = [
  '1. 在用户个人页面通过点击名字右方的星形图标添加饭友到列表',
  '2. 拖拽头像重新排序',
  '3. 按住 Shift 键点击头像删除',
  '4. 右击「有爱饭友」清空列表',
].join('\n')
const CONFIRMING_MESSAGE = '确定要清空有爱饭友列表吗？请注意这个操作无法撤回。'
const CLASSNAME_ITEM = 'sf-favorite-fanfouer-item'
const STORAGE_KEY_COLLAPSED_STATE = 'favorite-fanfouers/isCollapsed'
const STORAGE_AREA_NAME_COLLAPSED_STATE = 'local'

export default context => {
  const {
    requireModules,
    registerBroadcastListener,
    unregisterBroadcastListener,
    elementCollection,
  } = context
  const { storage, proxiedCreateTab } = requireModules([ 'storage', 'proxiedCreateTab' ])

  let unmount
  const readFriendsList = createFriendsListReader(storage)
  const writeFriendsList = createFriendsListWriter(storage)

  elementCollection.add({
    friends: '#friends',
  })

  function readCollapsedState() {
    return storage.read(STORAGE_KEY_COLLAPSED_STATE, STORAGE_AREA_NAME_COLLAPSED_STATE)
  }

  async function writeCollapsedState(newValue) {
    await storage.write(STORAGE_KEY_COLLAPSED_STATE, newValue, STORAGE_AREA_NAME_COLLAPSED_STATE)
  }

  function getProfilePageUrl(userId) {
    return `${window.location.protocol}//fanfou.com/${userId}`
  }

  const SortableList = sortableContainer(({ items, instance }) => (
    <ul ref={instance.setListRef} className="alist">
      { items.map((item, index) => (
        <SortableItem key={`item-${item.userId}`} index={index} item={item} instance={instance} />
      )) }
    </ul>
  ))

  const SortableItem = sortableElement(({ item, instance }) => (
    <li key={item.userId} className={CLASSNAME_ITEM}>
      <a href={getProfilePageUrl(item.userId)} title={item.nickname}>
        <DragHandle item={item} instance={instance} />
        <span>{item.nickname}</span>
      </a>
    </li>
  ))

  const DragHandle = sortableHandle(({ item, instance }) => (
    <img src={item.avatarUrl} alt={item.nickname} onClick={event => instance.onClickAvatar(event, item)} />
  ))

  class FavoriteFanfouers extends Component {
    constructor(...args) {
      super(...args)

      this.state = {
        isReady: false,
        isCollapsed: false,
        friendsData: [],
      }

      this.loadData()
    }

    async loadData() {
      this.setState({
        isReady: true,
        isCollapsed: await readCollapsedState(),
        friendsData: await readFriendsList(),
      })
    }

    setFriendsList = newValue => {
      this.setState({
        friendsData: newValue,
      }, () => {
        writeFriendsList(newValue)
      })
    }

    onStorageChange = createStorageChangeHandler(() => {
      this.loadData()
    })

    render() {
      return this.state.isReady && (
        <div id="sf-favorite-fanfouers-list" className="colltab">
          {this.renderToggle()}
          {this.renderTitle()}
          {this.renderFriendsList()}
          {this.renderOpenAll()}
          {this.renderEmpty()}
        </div>
      )
    }

    renderToggle() {
      return (
        <b className={cx({ collapse: this.state.isCollapsed })} />
      )
    }

    renderTitle() {
      return (
        <h2 onClick={this.onClickTitle} onContextMenu={this.onRightClickTitle}>有爱饭友</h2>
      )
    }

    onClickTitle = event => {
      // 饭否也监听了 click 事件，并且会尝试修改 <b /> 的类名
      // 所以阻止冒泡避免类名错乱
      event.stopImmediatePropagation()

      const newState = !this.state.isCollapsed
      this.setState({ isCollapsed: newState })
      writeCollapsedState(newState)
    }

    onRightClickTitle = async event => {
      event.preventDefault()

      // eslint-disable-next-line no-alert
      if (!window.confirm(CONFIRMING_MESSAGE)) return

      // 不需要使用 requireFanfouLib 加载
      window.jQuery(this.list).slideUp()
      await sleep(500)

      this.setFriendsList([])
    }

    renderFriendsList() {
      if (this.state.isCollapsed || !this.state.friendsData.length) {
        return null
      }

      const sortableListProps = {
        instance: this,
        items: this.state.friendsData,
        axis: 'xy',
        distance: 5,
        lockToContainerEdges: true,
        useDragHandle: true,
        onSortEnd: ({ oldIndex, newIndex }) => {
          const newValue = arrayMove(this.state.friendsData, oldIndex, newIndex)

          this.setFriendsList(newValue)
        },
      }

      return (
        <SortableList {...sortableListProps} />
      )
    }

    setListRef = element => {
      this.list = element
    }

    onClickAvatar = async (event, item) => {
      if (!event.shiftKey) return
      event.preventDefault()

      const li = event.path.find(element => element.matches(`.${CLASSNAME_ITEM}`))
      const friendsData = [ ...this.state.friendsData ]

      await fadeOut(li, 400)

      arrayRemove(friendsData, item)
      this.setFriendsList(friendsData)
    }

    renderOpenAll() {
      if (this.state.isCollapsed || !this.state.friendsData.length) {
        return null
      }

      return (
        <div>
          <a onClick={this.openAll}>» 打开所有</a>
          { this.renderTip() }
        </div>
      )
    }

    openAll = async () => {
      for (const friendData of this.state.friendsData) {
        proxiedCreateTab.create({
          url: getProfilePageUrl(friendData.userId),
          openInBackgroundTab: true,
        })
        await sleep(1000)
      }
    }

    renderEmpty() {
      if (this.state.isCollapsed || this.state.friendsData.length) {
        return null
      }

      return (
        <div>
          还没有饭友被添加到列表。
          { this.renderTip() }
        </div>
      )
    }

    renderTip() {
      const tooltipProps = {
        className: 'sf-tip',
        tipContentClassName: 'sf-favorite-fanfouers-tooltip',
        content: USER_GUIDE,
        direction: 'down-end',
      }

      return (
        <Tooltip {...tooltipProps}>?</Tooltip>
      )
    }

    componentDidMount() {
      registerBroadcastListener(this.onStorageChange)
    }

    componentWillUnmount() {
      unregisterBroadcastListener(this.onStorageChange)
    }
  }

  return {
    migrations: [ {
      migrationId: 'favorite-fanfouers/ls-to-chrome-storage-api-and-rename-properties',
      storageAreaName: 'sync',
      async executor() {
        const oldData = readJSONFromLocalStorage('fav_friends')
        if (!oldData) return

        const newData = oldData.map(item => ({
          userId: item.userid,
          nickname: item.nickname,
          avatarUrl: item.avatar_url,
        }))

        await writeFriendsList(newData)
      },
    } ],

    applyWhen: () => isHomePage(),

    waitReady: () => elementCollection.ready('friends'),

    onLoad() {
      const { friends } = elementCollection.getAll()

      unmount = preactRender(<FavoriteFanfouers />, root => {
        // 插入到「我关注的人」之前
        // 因为假定「有爱饭友」的使用频率更高，所以显示靠前一些这样更方便
        friends.before(root)
      })
    },

    onUnload() {
      unmount()
    },
  }
}
