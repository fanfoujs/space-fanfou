/* eslint-disable camelcase, no-console, unicorn/prefer-text-content */
// 饭否API返回的字段使用下划线命名（statuses_count, friends_count等），禁用camelcase检查
// 保留console.warn用于调试统计数据提取问题
// innerText用于兼容性，部分旧代码可能依赖其特定行为
import { h, Component } from 'preact'
import select from 'select-dom'
import cx from 'classnames'
import clamp from 'just-clamp'
import elementReady from 'element-ready'
import Tooltip from '@libs/Tooltip'
import { isUserProfilePage } from '@libs/pageDetect'
import preactRender from '@libs/preactRender'
import formatDate from '@libs/formatDate'

class SidebarStatistics extends Component {
  constructor(...args) {
    super(...args)

    this.state = {
      isProtected: false,
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
    console.log('[SpaceFanfou] SidebarStatistics: componentDidMount 开始')
    try {
      const userProfile = await this.fetchUserProfileData()
      console.log('[SpaceFanfou] SidebarStatistics: 获取到用户资料', userProfile)
      this.processData(userProfile)
      console.log('[SpaceFanfou] SidebarStatistics: 数据处理完成')
    } catch (error) {
      console.error('[SpaceFanfou] SidebarStatistics: 获取用户资料失败:', error)
      console.error('[SpaceFanfou] SidebarStatistics: 错误堆栈:', error.stack)
      // 保持默认的 "……" 状态，让用户知道数据加载失败
    }
  }

  async getUserId() {
    // 等待 meta 元素加载（页面可能还在渲染中）
    const metaElement = await elementReady('meta[name=author]')

    if (!metaElement) {
      throw new Error('Cannot find meta[name=author] element')
    }

    const metaContent = metaElement.getAttribute('content')
    if (!metaContent) {
      throw new Error('meta[name=author] has no content attribute')
    }

    const matched = metaContent.match(/\((.+)\)/)
    if (!matched) {
      throw new Error(`Cannot extract user ID from meta content: ${metaContent}`)
    }

    const userId = matched[1]
    return userId
  }

  async fetchUserProfileData() {
    console.log('[SpaceFanfou] SidebarStatistics: fetchUserProfileData 开始')
    // 从页面 DOM 直接提取数据，避免 OAuth 认证问题
    console.log('[SpaceFanfou] SidebarStatistics: 等待 #info 元素')
    await elementReady('#info')
    console.log('[SpaceFanfou] SidebarStatistics: #info 元素已就绪')

    const userProfile = {}

    // 1. 从 #info 区域的链接提取统计数字
    const info = select('#info')
    if (info) {
      const links = info.querySelectorAll('li a')
      links.forEach(link => {
        const text = link.textContent.trim()

        // 匹配 "22102 消息" 格式
        const statusMatch = text.match(/^(\d+)\s*消息$/)
        // 匹配 "171 他关注的人" 格式
        const friendsMatch = text.match(/^(\d+)\s*他关注的人$/)
        // 匹配 "459 关注他的人" 格式
        const followersMatch = text.match(/^(\d+)\s*关注他的人$/)

        if (statusMatch) userProfile.statuses_count = parseInt(statusMatch[1], 10)
        if (friendsMatch) userProfile.friends_count = parseInt(friendsMatch[1], 10)
        if (followersMatch) userProfile.followers_count = parseInt(followersMatch[1], 10)
      })
    }

    // 2. 从 .stabs 标签页提取消息数（备用方案）
    if (!userProfile.statuses_count) {
      const stabs = select('.stabs')
      if (stabs) {
        // 匹配 "消息 (22102)" 格式
        const statusMatch = stabs.textContent.match(/消息\s*\((\d+)\)/)
        if (statusMatch) {
          userProfile.statuses_count = parseInt(statusMatch[1], 10)
        }
      }
    }

    // 3. 从页面文本中提取（最后备用方案）
    if (!userProfile.statuses_count || !userProfile.friends_count || !userProfile.followers_count) {
      const bodyText = document.body.textContent

      if (!userProfile.statuses_count) {
        const statusMatch = bodyText.match(/(\d+)\s*消息/)
        if (statusMatch) userProfile.statuses_count = parseInt(statusMatch[1], 10)
      }

      if (!userProfile.friends_count) {
        const friendsMatch = bodyText.match(/(\d+)\s*他关注的人/)
        if (friendsMatch) userProfile.friends_count = parseInt(friendsMatch[1], 10)
      }

      if (!userProfile.followers_count) {
        const followersMatch = bodyText.match(/(\d+)\s*关注他的人/)
        if (followersMatch) userProfile.followers_count = parseInt(followersMatch[1], 10)
      }
    }

    // 3. 获取注册日期（从 #user_infos 或其他位置）
    const userInfos = select('#user_infos')
    if (userInfos) {
      const items = userInfos.querySelectorAll('li')
      items.forEach(item => {
        const text = item.textContent.trim()
        // 匹配 "注册于：2010-01-01" 格式
        const regMatch = text.match(/注册于[：:]\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2})/)
        if (regMatch) {
          // 转换为标准日期格式
          const dateStr = regMatch[1].replace(/年|月/g, '-').replace(/日?$/, '')
          userProfile.created_at = dateStr
        }
      })
    }

    // 4. 如果没有找到注册日期，使用估算（从 meta 标签或默认值）
    if (!userProfile.created_at) {
      // 默认使用一个合理的日期（2010年，饭否重新上线的年份）
      userProfile.created_at = '2010-01-01'
    }

    // 5. 检查是否为私密账号
    userProfile.protected = !!select('.protected, [data-protected="true"]')

    return userProfile
  }

  processData(userProfile) {
    // 是否加锁
    const isProtected = userProfile.protected

    // 注册时间
    const registerDate = new Date(userProfile.created_at)
    const registerDateText = formatDate(registerDate)

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
    const registerDurationText = `${registerDuration}（${registerDays} 天）`

    const actualRegisterDays = registerDate < new Date(2009, 6, 8)
      ? registerDays - 505
      : registerDays
    const daysSinceFanfouStart = Math.round(
      (new Date() - new Date(2007, 4, 12)) /
         (1000 * 3600 * 24))
    const registerDurationProgress = registerDays / daysSinceFanfouStart

    // 消息频率
    const statusFrequency = actualRegisterDays < 1
      ? userProfile.statuses_count
      : (userProfile.statuses_count / actualRegisterDays).toFixed(2)
    const statusFrequencyText = `平均 ${statusFrequency} 条消息 / 天`
    const statusFrequencyProgress = statusFrequency / 50

    // 影响力
    // 算法参见：https://spacekid.me/spacefanfou/
    let actionIndex = ((40 * statusFrequency) - (statusFrequency ** 2)) / 400
    if (statusFrequency > 20) actionIndex = 1
    if (isProtected) actionIndex = actionIndex * 0.75
    const influenceIndex = (
      (10 * Math.sqrt(userProfile.followers_count) / Math.log(registerDays + 100)) +
       ((userProfile.followers_count / 100) + (registerDays / 100)) * actionIndex
    ).toFixed(0)
    const influenceIndexText = `${influenceIndex} 公里`
    const influenceIndexProgress = influenceIndex / 100

    // 背景图片
    const backgroundImageUrl = userProfile.profile_background_image_url
    // 需要检测用户是否在「设置 → 模板」中选择了「不要背景图片」
    const isBackgroundImageDisabled = getComputedStyle(document.body).backgroundImage === 'none'

    this.setState({
      isProtected,
      registerDateText,
      registerDurationText,
      registerDurationProgress,
      statusFrequencyText,
      statusFrequencyProgress,
      influenceIndexText,
      influenceIndexProgress,
      backgroundImageUrl: isBackgroundImageDisabled ? null : backgroundImageUrl,
    })
  }

  render() {
    const {
      isProtected,
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
          <StatisticItem extraClassNames={cx({ 'sf-is-protected': isProtected })} text={`注册于 ${registerDateText}`} />
          <StatisticItem text={`饭龄：${registerDurationText}`} tip="注册时长" enableProgressBar progress={registerDurationProgress} progressBarColor="red" />
          <StatisticItem text={`饭量：${statusFrequencyText}`} tip="消息频率" enableProgressBar progress={statusFrequencyProgress} progressBarColor="green" />
          <StatisticItem text={`饭香：${influenceIndexText}`} tip="影响力" enableProgressBar progress={influenceIndexProgress} progressBarColor="blue" />
          { backgroundImageUrl && <StatisticItem text="» 查看背景图片" url={backgroundImageUrl} /> }
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
  const { elementCollection } = context

  let unmount

  elementCollection.add({
    stabs: '.stabs',
  })

  return {
    applyWhen: async () => {
      console.log('[SpaceFanfou] sidebar-statistics: 检查是否为用户资料页')
      const result = await isUserProfilePage()
      console.log('[SpaceFanfou] sidebar-statistics: isUserProfilePage =', result)
      return result
    },

    waitReady: async () => {
      console.log('[SpaceFanfou] sidebar-statistics: 等待 .stabs 元素')
      const result = await elementCollection.ready('stabs')
      console.log('[SpaceFanfou] sidebar-statistics: .stabs 元素已就绪')
      return result
    },

    onLoad() {
      console.log('[SpaceFanfou] sidebar-statistics: onLoad 开始')
      unmount = preactRender(<SidebarStatistics />, rendered => {
        console.log('[SpaceFanfou] sidebar-statistics: 渲染完成，插入 DOM')
        elementCollection.get('stabs').after(rendered)
      })
      console.log('[SpaceFanfou] sidebar-statistics: onLoad 完成')
    },

    onUnload() {
      console.log('[SpaceFanfou] sidebar-statistics: onUnload')
      unmount()
    },
  }
}
