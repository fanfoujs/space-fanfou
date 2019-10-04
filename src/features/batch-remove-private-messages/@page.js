import { h } from 'dom-chef'
import select from 'select-dom'
import elementReady from 'element-ready'
import wretch from 'wretch'
import { isPrivateMessagePage } from '@libs/pageDetect'
import untilElementRemoved from '@libs/untilElementRemoved'

const CLASSNAME_CHECKBOX = 'sf-private-message-checkbox'
const MESSAGE_CONFIRMING = '确定要删除选定的 %n 条私信吗？'

export default context => {
  const { requireModules } = context
  const { notification } = requireModules([ 'notification' ])

  let container
  let masterCheckbox

  function createMasterCheckbox() {
    masterCheckbox = (
      <input type="checkbox" onChange={onMasterCheckboxChanged} />
    )
  }

  function createContainer() {
    container = (
      <div id="sf-batch-remove-private-messages">
        <a className="bl" onClick={onRemoveSelectedClicked}>删除选定</a>
        {masterCheckbox}
      </div>
    )
  }

  function addCheckbox(li) {
    const checkbox = (
      <input type="checkbox" className={CLASSNAME_CHECKBOX} onChange={onCheckboxChanged} />
    )

    li.append(checkbox)
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
    const privateMessagesToRemove = getAllCheckboxes()
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.parentElement)
    const count = privateMessagesToRemove.length

    // eslint-disable-next-line no-alert
    if (count && window.confirm(MESSAGE_CONFIRMING.replace('%n', count))) {
      privateMessagesToRemove.forEach(removePrivateMessage)
    }
  }

  async function removePrivateMessage(li) {
    const button = select(':scope > .op > .delete', li)
    const url = button.href
    const data = {
      ajax: 'yes',
      action: 'privatemsg.del',
      privatemsg: button.href.split('/').pop(),
      token: button.getAttribute('token'),
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
    applyWhen: () => isPrivateMessagePage(),

    waitReady: () => elementReady('#footer'),

    onLoad() {
      createMasterCheckbox()
      createContainer()

      for (const li of select.all('#stream > ol > li')) {
        addCheckbox(li)
      }

      select('#main .tabs').append(container)
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
