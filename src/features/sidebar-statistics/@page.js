/* eslint-disable camelcase, no-console, unicorn/prefer-text-content */
// 饭否API返回的字段使用下划线命名（statuses_count, friends_count等），禁用camelcase检查
// 保留console.warn用于调试统计数据提取问题
// innerText用于兼容性，部分旧代码可能依赖其特定行为
import { h, Component } from 'preact'
import cx from 'classnames'
import clamp from 'just-clamp'
import select from 'select-dom'
import Tooltip from '@libs/Tooltip'
import { isUserProfilePage, isLoggedInUserProfilePage } from '@libs/pageDetect'
import preactRender from '@libs/preactRender'
import formatDate from '@libs/formatDate'

// 从 m.fanfou.com 抓取最早消息时间（仅对自己的页面有效，他人页面受移动站限制只显示近期内容）
async function fetchOldestStatusDate(userId, lastPage, proxiedFetch) {
  try {
    for (let page = lastPage; page >= Math.max(1, lastPage - 2); page--) {
      const url = `https://m.fanfou.com/${encodeURIComponent(userId)}/p.${page}`
      const { error, responseText: html } = await proxiedFetch.get({ url })
      if (error || !html) continue

      // m.fanfou.com 消息时间格式：YYYY-MM-DD HH:MM
      const dates = html.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g)
      if (dates && dates.length > 0) {
        return dates[dates.length - 1] // 页面最后一条 = 最早的
      }
    }
  } catch (error) {
    console.warn('[SpaceFanfou] fetchOldestStatusDate failed:', error)
  }
  return null
}

class SidebarStatistics extends Component {
  constructor(...args) {
    super(...args)

    this.state = {
      isProtected: false,
      oauthNotConfigured: false,
      registerDateText: '……',
      registerDurationText: '……',
      registerDurationProgress: 0,
      statusFrequencyText: '……',
      statusFrequencyProgress: 0,
      influenceIndexText: '……',
      influenceIndexProgress: 0,
      backgroundImageUrl: null,
    }
  }

  async componentDidMount() {
    // 1. 立即从 DOM 抓取基础数据（首屏展示）
    const scrapedData = this.scrapeDataFromDOM()
    this.processData(scrapedData)

    // 2. 异步尝试获取精确数据
    try {
      let finalProfile = scrapedData

      // 如果是自己页面，尝试从 m.fanfou.com 抓取注册时间
      if (isLoggedInUserProfilePage() && scrapedData.statuses_count > 0 && this.props.proxiedFetch) {
        const lastPage = Math.ceil(scrapedData.statuses_count / 30)
        const oldestDate = await fetchOldestStatusDate(this.getUserId(), lastPage, this.props.proxiedFetch)
        if (oldestDate) {
          finalProfile = { ...scrapedData, created_at: oldestDate }
          this.processData(finalProfile)
        }
      }

      // 尝试通过 OAuth 获取最完整资料
      const { profile, oauthNotConfigured } = await this.fetchUserProfileData()
      if (oauthNotConfigured) {
        // 如果 OAuth 未配置，且还没有 created_at，显示提示
        if (!finalProfile.created_at) {
          this.setState({ oauthNotConfigured: true })
        }
      } else if (profile && profile.created_at) {
        this.processData(profile)
      }
    } catch (error) {
      console.error('[SpaceFanfou] SidebarStatistics: 异步获取资料失败:', error)
    }
  }

  getUserId() {
    // 优先从 meta[name=author] 提取（格式：名字(userId)）
    const meta = select('meta[name=author]')
    if (meta) {
      const match = meta.content.match(/\(([^)]+)\)$/)
      if (match) return match[1]
    }

    // 从URL路径直接提取用户ID: fanfou.com/<userid>
    const splitPathname = window.location.pathname.split('/').filter(Boolean)
    const raw = splitPathname[0] || ''
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }

  scrapeDataFromDOM() {
    const userId = this.getUserId()
    const profile = {
      id: userId,
      statuses_count: 0,
      friends_count: 0,
      followers_count: 0,
      protected: false,
      profile_background_image_url: null,
    }

    // 计数 widget 固定在 #user_stats 容器内
    const userStats = select('#user_stats') || document
    const getCount = href => {
      const el = select(`a[href="${href}"] .count`, userStats)
      return el ? parseInt(el.textContent.replace(/\D/g, ''), 10) : 0
    }

    profile.statuses_count = getCount(`/${userId}`)
    profile.friends_count = getCount(`/friends/${userId}`)
    profile.followers_count = getCount(`/followers/${userId}`)

    // 加锁状态
    profile.protected = select.exists('.locked, .private-icon, [class*="private"]')

    // 背景图片
    const bgImage = getComputedStyle(document.body).backgroundImage
    if (bgImage && bgImage !== 'none') {
      profile.profile_background_image_url = bgImage.replace(/^url\(["']?|["']?\)$/g, '')
    }

    return profile
  }

  async fetchUserProfileData() {
    const { error, responseJSON } = await this.props.fanfouOAuth.request({
      url: 'https://api.fanfou.com/users/show.json',
      query: { id: this.getUserId() },
      responseType: 'json',
    })

    if (error) {
      const needsAuth = typeof error === 'string' && error.includes('授权')
      const oauthDisabled = typeof error === 'string' && error.includes('OAuth 功能未启用')
      console.warn('[SpaceFanfou] SidebarStatistics: OAuth API 请求失败:', error)
      return { profile: {}, oauthNotConfigured: needsAuth || oauthDisabled }
    }

    return { profile: responseJSON || {} }
  }

  processData(userProfile) {
    if (!userProfile) return

    // 是否加锁
    const isProtected = userProfile.protected

    // 注册时间（可能暂无）
    let {
      registerDateText,
      registerDurationText,
      registerDurationProgress,
    } = this.state

    if (userProfile.created_at) {
      const registerDate = new Date(userProfile.created_at)
      registerDateText = formatDate(registerDate)

      // 注册时长
      const registerDays = Math.floor((new Date() - registerDate) /
                     (1000 * 3600 * 24))
      const registerYears = Math.floor(registerDays / 365.2425)
      const registerMonths = Math.floor(
        (registerDays - registerYears * 365.2425) / 30.4369)
      const registerDuration = (registerYears > 0 || registerMonths > 0 ? '约 ' : '') +
        (registerYears > 0 ? registerYears + ' 年' +
         (registerMonths > 0 ? '零 ' + registerMonths + ' 个月' : '') :
          registerMonths > 0 ? registerMonths + ' 个月' :
            registerDays >= 7 ? '不足一个月' :
              registerDays > 0 ? '不足一周' : '刚来不到一天')
      registerDurationText = `${registerDuration}（${registerDays} 天）`

      const actualRegisterDays = registerDate < new Date(2009, 6, 8)
        ? registerDays - 505
        : registerDays
      const daysSinceFanfouStart = Math.round(
        (new Date() - new Date(2007, 4, 12)) /
           (1000 * 3600 * 24))
      registerDurationProgress = registerDays / daysSinceFanfouStart

      // 只有在有 registerDays 的情况下才计算频率和影响力
      // 消息频率
      const statusFrequency = actualRegisterDays < 1
        ? userProfile.statuses_count
        : (userProfile.statuses_count / actualRegisterDays).toFixed(2)
      const statusFrequencyText = `平均 ${statusFrequency} 条消息 / 天`
      const statusFrequencyProgress = statusFrequency / 50

      // 影响力
      let actionIndex = ((40 * statusFrequency) - (statusFrequency ** 2)) / 400
      if (statusFrequency > 20) actionIndex = 1
      if (isProtected) actionIndex = actionIndex * 0.75
      const influenceIndex = (
        (10 * Math.sqrt(userProfile.followers_count) / Math.log(registerDays + 100)) +
         ((userProfile.followers_count / 100) + (registerDays / 100)) * actionIndex
      ).toFixed(0)
      const influenceIndexText = `${influenceIndex} 公里`
      const influenceIndexProgress = influenceIndex / 100

      this.setState({
        isProtected,
        registerDateText: `注册于 ${registerDateText}`,
        registerDurationText,
        registerDurationProgress,
        statusFrequencyText,
        statusFrequencyProgress,
        influenceIndexText,
        influenceIndexProgress,
      })
    } else {
      // 仅更新能从 DOM 抓到的数据
      this.setState({ isProtected })
    }

    // 背景图片
    const backgroundImageUrl = userProfile.profile_background_image_url
    // 需要检测用户是否在「设置 → 模板」中选择了「不要背景图片」
    const isBackgroundImageDisabled = getComputedStyle(document.body).backgroundImage === 'none'

    this.setState({
      backgroundImageUrl: isBackgroundImageDisabled ? null : backgroundImageUrl,
    })
  }

  render() {
    const {
      isProtected,
      oauthNotConfigured,
      registerDateText,
      registerDurationText, registerDurationProgress,
      statusFrequencyText, statusFrequencyProgress,
      influenceIndexText, influenceIndexProgress,
      backgroundImageUrl,
    } = this.state

    return (
      <div class="stabs sf-sidebar-statistics">
        <h2>统计信息</h2>
        <ul>
          <StatisticItem extraClassNames={cx({ 'sf-is-protected': isProtected })} text={registerDateText} />
          <StatisticItem text={`饭龄：${registerDurationText}`} tip="注册时长" enableProgressBar progress={registerDurationProgress} progressBarColor="red" />
          <StatisticItem text={`饭量：${statusFrequencyText}`} tip="消息频率" enableProgressBar progress={statusFrequencyProgress} progressBarColor="green" />
          <StatisticItem text={`饭香：${influenceIndexText}`} tip="影响力" enableProgressBar progress={influenceIndexProgress} progressBarColor="blue" />
          { backgroundImageUrl && <StatisticItem text="» 查看背景图片" url={backgroundImageUrl} /> }
          { oauthNotConfigured && <li class="sf-sidebar-statistics-item sf-oauth-tip" style={{ color: '#999', fontSize: '11px', marginTop: '5px' }}>精确数据需在设置页完成 OAuth 授权</li> }
        </ul>
      </div>
    )
  }
}

class StatisticItem extends Component {
  render() {
    const { text, url, extraClassNames } = this.props
    const classnames = cx('sf-sidebar-statistics-item', extraClassNames)

    return (
      <li className={classnames}>
        { url ? <a href={url}>{ text }</a> : text }
        { this.renderTip() }
        { this.renderProgressBar() }
      </li>
    )
  }

  renderTip() {
    const { tip } = this.props
    const tooltipProps = {
      className: 'sf-tip',
      content: tip,
      distance: 0,
    }

    return tip && (
      <Tooltip {...tooltipProps}>?</Tooltip>
    )
  }

  renderProgressBar() {
    const { enableProgressBar, progressBarColor, progress } = this.props

    if (enableProgressBar) return (
      <div className={`sf-sidebar-statistics-progressbar sf-${progressBarColor}`}>
        <span style={{ width: (clamp(0, progress, 1) * 100) + '%' }} />
      </div>
    )
  }
}

export default context => {
  const { requireModules, elementCollection } = context
  const { fanfouOAuth, proxiedFetch } = requireModules([ 'fanfouOAuth', 'proxiedFetch' ])

  let unmount

  elementCollection.add({
    stabs: '.stabs',
  })

  return {
    applyWhen: () => isUserProfilePage(),

    waitReady: () => elementCollection.ready('stabs'),

    onLoad() {
      unmount = preactRender(<SidebarStatistics fanfouOAuth={fanfouOAuth} proxiedFetch={proxiedFetch} />, rendered => {
        elementCollection.get('stabs').after(rendered)
      })
    },

    onUnload() {
      unmount()
    },
  }
}
