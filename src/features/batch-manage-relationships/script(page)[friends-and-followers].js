import { h } from 'dom-chef'
import select from 'select-dom'
import wretch from 'wretch'
import { isLoggedInUserFriendsListPage, isLoggedInUserFollowersListPage, isFriendsListPage } from '@libs/pageDetect'
import safeElementReady from '@libs/safeElementReady'
import untilElementRemoved from '@libs/untilElementRemoved'
import promiseAny from '@libs/promiseAny'

const CLASSNAME_CHECKBOX = 'sf-friend-or-follower-checkbox'
const MESSAGE_CONFIRMING_FRIENDS = '确定要取消关注选定的 %n 个用户吗？'
const MESSAGE_CONFIRMING_FOLLOWERS = '确定要删除选定的 %n 个用户吗？'

export default context => {
  const { requireModules, elementCollection } = context
  const { notification } = requireModules([ 'notification' ])

  let container
  let masterCheckbox

  elementCollection.add({
    countTip: '#friends h2',
  })

  function createMasterCheckbox() {
    masterCheckbox = (
      <input type="checkbox" onChange={onMasterCheckboxChanged} />
    )
  }

  function createContainer() {
    const label = isFriendsListPage() ? '取消关注选定' : '删除选定用户'

    container = (
      <div id="sf-friends-and-followers-manager">
        <a className="bl" onClick={onRemoveSelectedClicked}>{ label }</a>
        { masterCheckbox }
      </div>
    )
  }

  function addCheckbox(li) {
    const checkbox = (
      <input type="checkbox" className={CLASSNAME_CHECKBOX} onChange={onCheckboxChanged} />
    )

    li.appendChild(checkbox)
  }

  function getAllCheckboxes() {
    return select.all(`.${CLASSNAME_CHECKBOX}`)
  }

  function onMasterCheckboxChanged() {
    for (const checkbox of getAllCheckboxes()) {
      checkbox.checked = masterCheckbox.checked
    }
  }

  function onCheckboxChanged() {
    const allCheckboxes = getAllCheckboxes()
    const checkedCheckboxes = allCheckboxes.filter(checkbox => checkbox.checked)

    if (checkedCheckboxes.length === 0) {
      masterCheckbox.checked = false
      masterCheckbox.indeterminate = false
    } else if (checkedCheckboxes.length === allCheckboxes.length) {
      masterCheckbox.checked = true
      masterCheckbox.indeterminate = false
    } else {
      masterCheckbox.checked = false
      masterCheckbox.indeterminate = true
    }
  }

  function onRemoveSelectedClicked() {
    const usersToRemove = getAllCheckboxes()
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.parentElement)
    const count = usersToRemove.length
    const confirmingMessage = isFriendsListPage()
      ? MESSAGE_CONFIRMING_FRIENDS
      : MESSAGE_CONFIRMING_FOLLOWERS

    // eslint-disable-next-line no-alert
    if (count && window.confirm(confirmingMessage.replace('%n', count))) {
      usersToRemove.forEach(removeUser)
    }
  }

  async function removeUser(li) {
    const button = select('[token]', li)
    const url = window.location.href
    const data = {
      ajax: 'yes',
      token: button.getAttribute('token'),
    }
    const userId = select('.name', li).getAttribute('href').split('/').pop()

    if (isFriendsListPage()) {
      data.action = 'friend.remove'
      data.friend = userId
    } else {
      data.action = 'follower.remove'
      data.follower = userId
    }

    const response = await wretch(url).formUrl(data).post().json()

    if (response.status) {
      window.FF.util.yFadeRemove(button, 'li')
      await untilElementRemoved(li)
      onCheckboxChanged()
    } else {
      notification.create(notification.ERROR, response.msg)
    }
  }

  return {
    applyWhen: () => promiseAny([
      isLoggedInUserFriendsListPage(),
      isLoggedInUserFollowersListPage(),
    ]),

    waitReady: () => safeElementReady('#footer'),

    onLoad() {
      createMasterCheckbox()
      createContainer()

      for (const li of select.all('#stream > ol > li')) {
        addCheckbox(li)
      }

      elementCollection.get('countTip').after(container)
    },

    onUnload() {
      container.remove()
      container = masterCheckbox = null

      for (const checkbox of getAllCheckboxes()) {
        checkbox.remove()
      }
    },
  }
}
