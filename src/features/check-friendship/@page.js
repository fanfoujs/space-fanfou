import { h } from 'dom-chef'
import select from 'select-dom'
import { isUserProfilePage, isLoggedInUserProfilePage } from '@libs/pageDetect'
import parseHTML from '@libs/parseHTML'
import promiseEvery from '@libs/promiseEvery'
import getCurrentPageOwnerUserId from '@libs/getCurrentPageOwnerUserId'
import neg from '@libs/neg'
import log from '@libs/log'

export default context => {
  const { requireModules, elementCollection } = context
  const { proxiedFetch } = requireModules([ 'proxiedFetch' ])

  const GENDER_PLACEHOLDER = '<GENDER_PLACEHOLDER>'
  const TEXT_INITIAL = `检查${GENDER_PLACEHOLDER}是否关注了你`
  const TEXT_BUSY = '检查中……'
  const TEXT_IS_FOLLOWED = `${GENDER_PLACEHOLDER}关注了你！`
  const TEXT_IS_NOT_FOLLOWED = `${GENDER_PLACEHOLDER}没有关注你 :(`

  let checkButton
  let hasChecked = false

  elementCollection.add({
    panel: '#panel',
  })

  function initCheckButton() {
    let userviewLink = select('#userview_link')

    if (!userviewLink) {
      const h1 = select('h1', elementCollection.get('panel'))

      userviewLink = <p id="userview_link"></p>
      h1.after(userviewLink)
    }

    checkButton = (
      // eslint-disable-next-line no-script-url
      <a href="javascript:void(0)" className="label" onClick={checkFriendship} />
    )
    userviewLink.append(checkButton)

    setText(TEXT_INITIAL)
  }

  function removeCheckButton() {
    checkButton.remove()
    checkButton = null
  }

  function getGender() {
    const re1 = /^性别：(男|女)$/
    const element1 = select.all('#user_infos > ul > li:not(#bio)')
      .find(element => re1.test(element.textContent))
    const matched1 = element1 && element1.textContent.match(re1)

    if (matched1) {
      const genderMap = { 男: '他', 女: '她' }

      return genderMap[matched1[1]]
    }

    const re2 = /^(他|她)关注的消息$/
    const element2 = select('#userview_link .label')
    const matched2 = element2 && element2.textContent.match(re2)

    if (matched2) {
      return matched2[1]
    }

    return ' TA '
  }

  function setText(text) {
    checkButton.textContent = text.replace(GENDER_PLACEHOLDER, getGender()).trim()
  }

  async function fetchFollowersList(pageNumber) {
    const url = `https://m.fanfou.com/followers/p.${pageNumber}`
    const { error: ajaxError, responseText: html } = await proxiedFetch.get({ url })
    let followerIds, hasReachedEnd

    if (ajaxError) {
      log.error('加载关注者列表失败', ajaxError)
      followerIds = []
      hasReachedEnd = true
    } else {
      const document = parseHTML(html)
      const items = select.all('ol > li > a > span.a', document)

      followerIds = items.map(item => item.textContent.replace(/^\(|\)$/g, ''))
      hasReachedEnd = !select.exists(`a[href="/followers/p.${pageNumber + 1}"]`, document)
    }

    return { followerIds, hasReachedEnd }
  }

  async function checkFriendship() {
    if (hasChecked) return
    hasChecked = true
    setText(TEXT_BUSY)

    const userId = await getCurrentPageOwnerUserId()
    let isFollowed = false
    let pageNumber = 0

    while (true) {
      const { followerIds, hasReachedEnd } = await fetchFollowersList(++pageNumber)

      isFollowed = followerIds.includes(userId)

      if (hasReachedEnd || isFollowed) {
        break
      }
    }

    setText(isFollowed ? TEXT_IS_FOLLOWED : TEXT_IS_NOT_FOLLOWED)
  }

  return {
    applyWhen: () => promiseEvery([
      isUserProfilePage(),
      neg(isLoggedInUserProfilePage()),
    ]),

    waitReady: () => elementCollection.ready('panel'),

    onLoad() {
      initCheckButton()
    },

    onUnload() {
      removeCheckButton()
    },
  }
}
