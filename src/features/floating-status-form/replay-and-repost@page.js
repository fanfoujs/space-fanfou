import select from 'select-dom'
import { on, off } from 'delegated-events'
import triggerEvent from 'compat-trigger-event'
import { isPrivateMessagePage } from '@libs/pageDetect'
import every from '@libs/promiseEvery'
import getLoggedInUserProfilePageUrl from '@libs/getLoggedInUserProfilePageUrl'
import arrayUniquePush from '@libs/arrayUniquePush'
import neg from '@libs/neg'
import { POST_STATUS_SUCCESS_EVENT_TYPE } from '@constants'

export default context => {
  const { readOptionValue, elementCollection, registerDOMEventListener } = context

  elementCollection.add({
    update: '#phupdate',
    form: { parent: 'update', selector: 'form' },
    textarea: { parent: 'update', selector: 'textarea' },
  })

  registerDOMEventListener('textarea', POST_STATUS_SUCCESS_EVENT_TYPE, onPostStatusSuccess)

  function onPostStatusSuccess(event) {
    const { textarea } = elementCollection.getAll()
    const { formDataJson } = event.detail
    const statusContent = formDataJson.content || formDataJson.desc

    if (readOptionValue('keepFocusAfterPosting')) {
      textarea.focus()
    }

    if (readOptionValue('keepAtNamesAfterPosting') && statusContent.startsWith('@')) {
      const userNicknames = []
      extractUserNicknamesFromStatusContent(statusContent, userNicknames)
      textarea.value = userNicknames.join(' ') + ' '

      const selectionPos = textarea.value.length
      textarea.setSelectionRange(selectionPos, selectionPos)
    }
  }

  function extractStatusId(li) {
    return select('.stamp .time', li).getAttribute('ffid')
  }

  function extractStatusContent(li) {
    // 不使用 select('.content', li).textContent.trim() 的方式
    // 因为 .content 的内容可能会被修改（比如展开短链接），也可能包含被截断的链接
    // 而转发的时候应该保留原始消息内容
    const repostLink = select(':scope > .op > .repost', li)
    const queryString = repostLink.search.slice(1) // 去掉开头的 '?'
    const urlSearchParams = new URLSearchParams(queryString)
    const queryMap = Object.fromEntries(urlSearchParams.entries())
    const statusContent = queryMap.status

    return statusContent
  }

  function extractUserNicknamesFromStatusDOM(li, callback) {
    if (Array.isArray(callback)) {
      const userNicknames = []

      callback = userNickname => arrayUniquePush(userNicknames, userNickname)
    }

    for (const atUserElement of select.all('.content a.former', li)) {
      const userUrl = atUserElement.href
      const userNickname = '@' + atUserElement.textContent

      if (userUrl !== getLoggedInUserProfilePageUrl()) callback(userNickname)
    }
  }

  function extractUserNicknamesFromStatusContent(statusContent, callback) {
    if (Array.isArray(callback)) {
      const userNicknames = []

      callback = userNickname => arrayUniquePush(userNicknames, userNickname)
    }

    for (const textPart of statusContent.split(/\s+/)) {
      if (textPart.charAt(0) === '@') callback(textPart)
    }
  }

  const createHandler = type => event => {
    event.preventDefault()

    const { form, textarea } = elementCollection.getAll()
    const li = event.path.find(element => element.tagName.toLowerCase() === 'li')
    const authorElement = select('.author', li)
    const targetStatusId = extractStatusId(li)
    const targetStatusAuthorNickname = '@' + authorElement.textContent
    const targetStatusText = extractStatusContent(li)
    const oldStatusContent = textarea.value.trim()
    let inReplyToStatusId = '', repostStatusId = ''
    let newStatusContent = ''
    let selectionStartPos = -1, selectionEndPos = -1

    if (type === 'reply') {
      const atUserNicknames = [ targetStatusAuthorNickname ]
      const oldStatusNickNames = []

      extractUserNicknamesFromStatusContent(oldStatusContent, oldStatusNickNames)
      extractUserNicknamesFromStatusDOM(li, nickname => {
        if (!oldStatusNickNames.includes(nickname)) {
          arrayUniquePush(atUserNicknames, nickname)
        }
      })

      newStatusContent = atUserNicknames.join(' ') + ' ' + oldStatusContent
      selectionStartPos = targetStatusAuthorNickname.length + 1 // 第一个@用户名及其后面的空格之后的位置
      selectionEndPos = newStatusContent.length
      inReplyToStatusId = targetStatusId
    } else if (type === 'repost') {
      newStatusContent = `${oldStatusContent}${targetStatusText}`
      selectionStartPos = 0
      selectionEndPos = oldStatusContent.length
      repostStatusId = targetStatusId
    }

    textarea.value = newStatusContent
    textarea.focus()
    triggerEvent(textarea, 'change')
    textarea.setSelectionRange(selectionStartPos, selectionEndPos)
    form.elements.in_reply_to_status_id.value = inReplyToStatusId
    form.elements.repost_status_id.value = repostStatusId
  }

  const onClickReply = createHandler('reply')
  const onClickRepost = createHandler('repost')

  return {
    applyWhen: () => every([
      neg(isPrivateMessagePage()),
      elementCollection.ready('update'),
    ]),

    onLoad() {
      on('click', '#stream ol .op .reply', onClickReply)
      on('click', '#stream ol .op .repost', onClickRepost)
    },

    onUnload() {
      off('click', '#stream ol .op .reply', onClickReply)
      off('click', '#stream ol .op .repost', onClickRepost)
    },
  }
}
