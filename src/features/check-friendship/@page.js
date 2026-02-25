import { h } from 'dom-chef'
import select from 'select-dom'
import { isUserProfilePage, isLoggedInUserProfilePage } from '@libs/pageDetect'
import promiseEvery from '@libs/promiseEvery'
import getCurrentPageOwnerUserId from '@libs/getCurrentPageOwnerUserId'
import neg from '@libs/neg'
import log from '@libs/log'
import { FANFOU_OAUTH_API_REQUEST } from '@constants'

export default context => {
  const { requireModules, elementCollection } = context
  const { messaging } = requireModules([ 'messaging' ])

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

  // 已移除基于 HTML Scraping 的翻页检查函数

  async function checkFriendship() {
    if (hasChecked) return
    hasChecked = true
    setText(TEXT_BUSY)

    try {
      const targetUserId = await getCurrentPageOwnerUserId()

      // 切换至稳健的 OAuth 官方 API
      const { error, responseJSON } = await messaging.send(FANFOU_OAUTH_API_REQUEST, {
        url: 'https://api.fanfou.com/friendships/show.json',
        // eslint-disable-next-line camelcase
        query: { target_id: targetUserId },
        responseType: 'json',
      })

      if (error) {
        log.error('API请求失败', error)
        if (typeof error === 'string' && error.includes('未完成授权')) {
          setText('请前往设置页完成授权')
        } else {
          setText('出现异常，点击重试')
        }
        hasChecked = false // 允许重试
        return
      }

      if (!responseJSON || !responseJSON.relationship) {
        throw new Error('API 响应格式无效')
      }

      const { target, source } = responseJSON.relationship
      const iFollowThem = source.following === 'true'
      const theyFollowMe = target.following === 'true'

      if (theyFollowMe && iFollowThem) setText(TEXT_MUTUAL)
      else if (theyFollowMe) setText(TEXT_THEY_FOLLOW)
      else if (iFollowThem) setText(TEXT_I_FOLLOW)
      else setText(TEXT_NO_FOLLOW)
    } catch (err) {
      log.error('检查关注关系发生异常', err)
      setText('出现异常，点击重试')
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
