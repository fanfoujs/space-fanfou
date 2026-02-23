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
  const TEXT_INITIAL = `检查与${GENDER_PLACEHOLDER}的关系`
  const TEXT_BUSY = '检查中……'
  const TEXT_MUTUAL = '互相关注 ✓'
  const TEXT_THEY_FOLLOW = `${GENDER_PLACEHOLDER}关注了你`
  const TEXT_I_FOLLOW = `你关注了${GENDER_PLACEHOLDER}`
  const TEXT_NO_FOLLOW = '互未关注'

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

    // 防止重复添加：先移除已存在的按钮
    const existingButton = select('.sf-check-friendship-button', userviewLink)
    if (existingButton) existingButton.remove()

    checkButton = (
      // eslint-disable-next-line no-script-url
      <a href="javascript:void(0)" className="label sf-check-friendship-button" onClick={checkFriendship} />
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

  // 通用翻页抓取函数：baseUrl 为不含页码部分，pageKey 用于检测下一页链接
  async function fetchUserList(baseUrl, pageKey, pageNumber) {
    const url = `${baseUrl}${pageNumber}`
    const { error, responseText: html } = await proxiedFetch.get({ url })

    if (error) {
      log.error('加载列表失败', error)
      return { ids: [], hasReachedEnd: true }
    }

    const doc = parseHTML(html)
    const items = select.all('ol > li > a > span.a', doc)
    const ids = items.map(item => item.textContent.replace(/^\(|\)$/g, ''))
    const hasReachedEnd = !select.exists(`a[href="/${pageKey}/p.${pageNumber + 1}"]`, doc)

    return { ids, hasReachedEnd }
  }

  // 检查 targetUserId 是否在我的 followers 列表里（对方是否关注了我）
  async function checkTheyFollowMe(targetUserId) {
    let pageNumber = 0

    while (true) {
      const { ids, hasReachedEnd } = await fetchUserList('https://m.fanfou.com/followers/p.', 'followers', ++pageNumber)

      if (ids.includes(targetUserId)) return true
      if (hasReachedEnd) return false
    }
  }

  // 检查 targetUserId 是否在我的 friends 列表里（我是否关注了对方）
  async function checkIFollowThem(targetUserId) {
    let pageNumber = 0

    while (true) {
      const { ids, hasReachedEnd } = await fetchUserList('https://m.fanfou.com/friends/p.', 'friends', ++pageNumber)

      if (ids.includes(targetUserId)) return true
      if (hasReachedEnd) return false
    }
  }

  async function checkFriendship() {
    if (hasChecked) return
    hasChecked = true
    setText(TEXT_BUSY)

    try {
      const targetUserId = await getCurrentPageOwnerUserId()

      // 双向并行检查
      const [ theyFollowMe, iFollowThem ] = await Promise.all([
        checkTheyFollowMe(targetUserId),
        checkIFollowThem(targetUserId),
      ])

      if (theyFollowMe && iFollowThem) setText(TEXT_MUTUAL)
      else if (theyFollowMe) setText(TEXT_THEY_FOLLOW)
      else if (iFollowThem) setText(TEXT_I_FOLLOW)
      else setText(TEXT_NO_FOLLOW)
    } catch (err) {
      log.error('检查关注关系发生异常', err)
      setText('出现异常，点击重试')
    } finally {
      hasChecked = false // 允许重试
    }
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
