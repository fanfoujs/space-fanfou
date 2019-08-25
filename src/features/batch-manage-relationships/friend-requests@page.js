import { h } from 'dom-chef'
import select from 'select-dom'
import elementReady from 'element-ready'
import wretch from 'wretch'
import { isFriendRequestPage } from '@libs/pageDetect'
import untilElementRemoved from '@libs/untilElementRemoved'
import neg from '@libs/neg'
import noop from '@libs/noop'

export default context => {
  const { elementCollection } = context

  const CLASSNAME_CHECKBOX = 'sf-friend-request-checkbox'
  const ACTION_TIP_MAP = {
    'friend.acceptadd': '确定要通过选中的 %n 个关注请求并请求回关吗？',
    'friend.accept': '确定要通过选中的 %n 个关注请求吗？',
    'friend.deny': '确定要忽略选中的 %n 个关注请求吗？',
  }
  const NO_REQUESTS_TIP = '目前没有关注请求'

  let container

  const options = [ {
    label: '批量处理……',
  }, {
    label: '全选',
    handler: () => modifyCheckedStates(() => true),
  }, {
    label: '反选',
    handler: () => modifyCheckedStates(neg),
  }, {
    label: '取消选择',
    handler: () => modifyCheckedStates(() => false),
  }, {
    label: '接受请求并关注',
    handler: () => processFriendRequests('friend.acceptadd'),
  }, {
    label: '接受请求',
    handler: () => processFriendRequests('friend.accept'),
  }, {
    label: '忽略请求',
    handler: () => processFriendRequests('friend.deny'),
  } ]

  elementCollection.add({
    countTip: '#requests h2',
  })

  function createContainer() {
    container = (
      <div id="sf-friend-requests-manager">
        <select onChange={onSelectChanged}>
          { options.map((option, index) => (
            <option key={index}>{ option.label }</option>
          )) }
        </select>
      </div>
    )
  }

  function addCheckbox(li) {
    const checkbox = (
      <input type="checkbox" className={CLASSNAME_CHECKBOX} />
    )

    li.appendChild(checkbox)
  }

  function getAllCheckboxes() {
    return select.all(`.${CLASSNAME_CHECKBOX}`)
  }

  function onSelectChanged(event) {
    const selectElement = event.target
    const selectedOption = options[selectElement.selectedIndex]
    const handler = selectedOption.handler || noop

    handler()
    selectElement.selectedIndex = 0
  }

  function modifyCheckedStates(fn) {
    for (const checkbox of getAllCheckboxes()) {
      checkbox.checked = fn(checkbox.checked)
    }
  }

  function processFriendRequests(action) {
    const checkedCheckboxes = getAllCheckboxes().filter(checkbox => checkbox.checked)
    const friendRequestsToProcess = checkedCheckboxes.map(checkbox => checkbox.parentElement)
    const count = checkedCheckboxes.length
    const actionTip = ACTION_TIP_MAP[action].replace('%n', count)

    // eslint-disable-next-line no-alert
    if (count && window.confirm(actionTip)) {
      for (const li of friendRequestsToProcess) {
        processFriendRequest(li, action)
      }
    }
  }

  async function processFriendRequest(li, action) {
    const button = select('a.post_act', li)
    const url = window.location.href
    const data = {
      ajax: 'yes',
      action,
      friend: select('.name', li).getAttribute('href').split('/').pop(),
      token: button.getAttribute('token'),
    }

    await wretch(url).formUrl(data).post()

    window.FF.util.yFadeRemove(button, 'li')
    await untilElementRemoved(li)

    countTipMinusOne()
  }

  function countTipMinusOne() {
    const { countTip } = elementCollection.getAll()
    const textNode = countTip.firstChild
    const oldCount = parseInt(textNode.textContent.match(/^\d+/)[0], 10)
    const newCount = oldCount - 1

    textNode.textContent = newCount
      ? textNode.textContent.replace(oldCount, newCount)
      : NO_REQUESTS_TIP
  }

  return {
    applyWhen: () => isFriendRequestPage(),

    waitReady: () => elementReady('#footer'),

    onLoad() {
      createContainer()

      for (const li of select.all('#stream > ol > li')) {
        addCheckbox(li)
      }

      elementCollection.get('countTip').appendChild(container)
    },

    onUnload() {
      container.remove()
      container = null

      for (const checkbox of getAllCheckboxes()) {
        checkbox.remove()
      }
    },
  }
}
