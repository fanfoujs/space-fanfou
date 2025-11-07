import { h } from 'dom-chef'
import select from 'select-dom'
import elementReady from 'element-ready'
import wretch from 'wretch'
import { isLoggedInUserProfilePage } from '@libs/pageDetect'
import collapseSelection from '@libs/collapseSelection'
import noop from '@libs/noop'

const CLASSNAME_CHECKBOX = 'sf-status-checkbox'
const MESSAGE_CONFIRMING = '确定要删除选定的 %n 条消息吗？'
const CLASSNAME_MULTIPLE_SELECTION_ACTIVE = 'sf-multiple-selection-active'
const CLASSNAME_MULTIPLE_SELECTION_IN_RANGE = 'sf-multiple-selection-in-range'

export default context => {
  const { requireModules, elementCollection, registerDOMEventListener } = context
  const { notification } = requireModules([ 'notification' ])

  let container

  const options = [ {
    label: '批量处理……',
  }, {
    label: '全选',
    handler: () => modifyCheckedStates(() => true),
  }, {
    label: '反选',
    handler: () => modifyCheckedStates((li, currentState) => !currentState),
  }, {
    label: '选中回复',
    handler() {
      modifyCheckedStates((li, currentState) => (
        getStatusType(li) === 'reply' || currentState
      ))
    },
  }, {
    label: '选中转发',
    handler() {
      modifyCheckedStates((li, currentState) => (
        getStatusType(li) === 'repost' || currentState
      ))
    },
  }, {
    label: '选中回复和转发',
    handler() {
      modifyCheckedStates((li, currentState) => (
        getStatusType(li) !== 'normal' || currentState
      ))
    },
  }, {
    label: '取消选择',
    handler: () => modifyCheckedStates(() => false),
  } ]

  const multipleSelectionInitialState = {
    isActive: false,
    startingLi: null,
    previousSelected: [],
  }
  const multipleSelectionState = { ...multipleSelectionInitialState }

  elementCollection.add({
    stream: '#stream',
    statuses: { selector: '#stream > ol > li', getAll: true },
  })

  registerDOMEventListener('stream', 'click', onClick)
  registerDOMEventListener('statuses', 'mouseenter', onMouseEnter)
  registerDOMEventListener(window, 'keyup', onKeyUp)

  function createContainer() {
    container = (
      <div id="sf-batch-remove-statuses">
        <select onChange={onSelectChanged}>
          { options.map((option, index) => (
            <option key={index}>{ option.label }</option>
          )) }
        </select>
        <a className="bl" onClick={onRemoveSelectedClicked}>删除选定</a>
      </div>
    )
  }

  function addCheckbox(li) {
    const checkbox = (
      <input type="checkbox" className={CLASSNAME_CHECKBOX} />
    )

    li.append(checkbox)
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
      const li = checkbox.parentElement
      const currentState = checkbox.checked

      checkbox.checked = fn(li, currentState)
    }
  }

  function getStatusType(li) {
    const reply = select(':scope > .stamp > .reply', li)
    const text = reply?.textContent || ''
    let type = 'normal'

    if (/^给.+的回复/.test(text)) {
      type = 'reply'
    } else if (text.startsWith('转自')) {
      type = 'repost'
    }

    return type
  }

  function getSelectedStatuses() {
    return getAllCheckboxes()
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.parentElement)
  }

  async function onRemoveSelectedClicked() {
    const statusesToRemove = getSelectedStatuses()
    const count = statusesToRemove.length

    // eslint-disable-next-line no-alert
    if (count && window.confirm(MESSAGE_CONFIRMING.replace('%n', count))) {
      await Promise.all(statusesToRemove.map(removeStatus))
      window.location.reload()
    }
  }

  async function removeStatus(li) {
    const button = select(':scope > .op > .delete', li)
    // 删除普通消息时 `actionType` 为 "msg.del"，删除图片消息时为 "photo.del"
    // 相应的 `fieldName` 分别应为 "msg" 和 "photo"
    const [ id, actionType ] = button.href.split('/').reverse()
    const fieldName = actionType.split('.')[0]
    const url = window.location.href
    const data = {
      ajax: 'yes',
      action: actionType,
      [fieldName]: id,
      token: button.getAttribute('token'),
    }
    const response = await wretch(url).formUrl(data).post().json()

    if (response.status) {
      window.FF.util.yFadeRemove(button, 'li')
    } else {
      notification.create(notification.ERROR, response.msg)
    }
  }

  function resetMultipleSelectionState() {
    Object.assign(multipleSelectionState, multipleSelectionInitialState)
  }

  function getRelatedLiFromEventObject(event) {
    return event.path.find(element => element.matches?.('#stream > ol > li'))
  }

  function onClick(event) {
    const clickedLi = getRelatedLiFromEventObject(event)

    if (!event.shiftKey || !clickedLi) {
      return
    }

    if (multipleSelectionState.isActive) {
      stopMultipleSelection()
    } else {
      startMultipleSelection(clickedLi)
    }

    // 因为按住了 Shift 键，可能会选中文本。手工取消选中。
    collapseSelection()
  }

  function onMouseEnter(event) {
    const relatedLi = getRelatedLiFromEventObject(event)

    if (event.shiftKey && multipleSelectionState.isActive && relatedLi) {
      handleMultipleSelection(relatedLi)
    }
  }

  function onKeyUp(event) {
    if (event.key === 'Shift' && multipleSelectionState.isActive) {
      cancelMultipleSelection()
    }
  }

  function startMultipleSelection(startingLi) {
    resetMultipleSelectionState()

    Object.assign(multipleSelectionState, {
      isActive: true,
      startingLi,
      previousSelected: getSelectedStatuses(),
    })
    elementCollection.get('stream').classList.add(CLASSNAME_MULTIPLE_SELECTION_ACTIVE)

    handleMultipleSelection(startingLi)
  }

  function handleMultipleSelection(currentLi) {
    const { startingLi, previousSelected } = multipleSelectionState
    const allStatuses = elementCollection.get('statuses')
    const startingIndex = allStatuses.indexOf(startingLi)
    const currentIndex = allStatuses.indexOf(currentLi)
    const littleIndex = Math.min(startingIndex, currentIndex)
    const bigIndex = Math.max(startingIndex, currentIndex)

    allStatuses.forEach((li, index) => {
      const isInRange = littleIndex <= index && index <= bigIndex
      const isPreviousSelected = previousSelected.includes(li)
      const checkbox = select(`.${CLASSNAME_CHECKBOX}`, li)

      li.classList.toggle(CLASSNAME_MULTIPLE_SELECTION_IN_RANGE, isInRange)
      checkbox.checked = isInRange || isPreviousSelected
    })
  }

  function stopMultipleSelection() {
    for (const li of elementCollection.get('statuses')) {
      li.classList.remove(CLASSNAME_MULTIPLE_SELECTION_IN_RANGE)
    }

    elementCollection.get('stream').classList.remove(CLASSNAME_MULTIPLE_SELECTION_ACTIVE)
    resetMultipleSelectionState()
  }

  function cancelMultipleSelection() {
    const { previousSelected } = multipleSelectionState

    for (const li of elementCollection.get('statuses')) {
      li.classList.remove(CLASSNAME_MULTIPLE_SELECTION_IN_RANGE)
    }

    modifyCheckedStates(li => previousSelected.includes(li))

    elementCollection.get('stream').classList.remove(CLASSNAME_MULTIPLE_SELECTION_ACTIVE)
    resetMultipleSelectionState()
  }

  return {
    applyWhen: () => isLoggedInUserProfilePage(),

    waitReady: () => elementReady('#footer'),

    onLoad() {
      createContainer()

      for (const li of elementCollection.get('statuses')) {
        addCheckbox(li)
      }

      select('#info').append(container)
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
