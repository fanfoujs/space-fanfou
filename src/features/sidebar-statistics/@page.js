/* eslint-disable camelcase, no-console, unicorn/prefer-text-content */
// 饭否API返回的字段使用下划线命名（statuses_count, friends_count等），禁用camelcase检查
// 保留console.warn用于调试统计数据提取问题
// innerText用于兼容性，部分旧代码可能依赖其特定行为
import { h, Component } from 'preact'
import cx from 'classnames'
import clamp from 'just-clamp'
import elementReady from 'element-ready'
import select from 'select-dom'
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
    try {
      const userProfile = await this.fetchUserProfileData()
      this.processData(userProfile)
    } catch (error) {
      console.error('[SpaceFanfou] SidebarStatistics: 获取用户资料失败:', error)
      // 保持默认的 "……" 状态
    }
  }

  getUserId() {
    // 从URL路径直接提取用户ID: fanfou.com/<userid>
    const splitPathname = window.location.pathname.split('/')
    return splitPathname[1]
  }

  async fetchUserProfileData() {
    // 等待当前页面的#info元素加载
    console.log('[SpaceFanfou] SidebarStatistics: 等待 #info 元素...')
    await elementReady('#info')
    console.log('[SpaceFanfou] SidebarStatistics: #info 元素已就绪')

    const userProfile = {}

    // 步骤1: 从当前页面的 #info 区域提取统计数字
    const info = select('#info')
    console.log('[SpaceFanfou] SidebarStatistics: #info 元素:', info)

    if (info) {
      const links = info.querySelectorAll('li a')
      console.log('[SpaceFanfou] SidebarStatistics: 找到', links.length, '个链接')

      links.forEach((link, index) => {
        const text = link.textContent.trim()
        console.log(`[SpaceFanfou] SidebarStatistics: 链接[${index}]:`, text)

        // 匹配 "22102 消息" 格式
        const statusMatch = text.match(/^(\d+)\s*消息$/)
        // 匹配 "171 他关注的人" 或 "171 她关注的人" 格式
        const friendsMatch = text.match(/^(\d+)\s*(他|她)?关注的人$/)
        // 匹配 "459 关注他的人" 或 "459 关注她的人" 格式
        const followersMatch = text.match(/^(\d+)\s*关注(他|她)的人$/)

        if (statusMatch) {
          userProfile.statuses_count = parseInt(statusMatch[1], 10)
          console.log('[SpaceFanfou] SidebarStatistics: ✓ 提取到消息数:', userProfile.statuses_count)
        }
        if (friendsMatch) {
          userProfile.friends_count = parseInt(friendsMatch[1], 10)
          console.log('[SpaceFanfou] SidebarStatistics: ✓ 提取到关注数:', userProfile.friends_count)
        }
        if (followersMatch) {
          userProfile.followers_count = parseInt(followersMatch[1], 10)
          console.log('[SpaceFanfou] SidebarStatistics: ✓ 提取到粉丝数:', userProfile.followers_count)
        }
      })

      console.log('[SpaceFanfou] SidebarStatistics: DOM提取结果:', userProfile)
    } else {
      console.warn('[SpaceFanfou] SidebarStatistics: ❌ 未找到 #info 元素')
    }

    // 步骤2: 尝试通过API获取注册日期（可选，可能失败）
    const { proxiedFetch } = this.props
    if (proxiedFetch) {
      try {
        const userId = this.getUserId()
        const apiUrl = `http://api.fanfou.com/users/show.json`
        const query = { id: userId, mode: 'lite' }

        const { error: ajaxError, responseText: jsonText } = await proxiedFetch.get({
          url: apiUrl,
          query,
        })

        if (ajaxError) {
          console.warn('[SpaceFanfou] SidebarStatistics: API请求失败（预期内）:', ajaxError)
        } else if (jsonText) {
          try {
            const userData = JSON.parse(jsonText)

            if (userData.created_at) {
              // API返回的格式："Sat Jun 09 23:56:33 +0000 2007"
              // 转换为 YYYY-MM-DD 格式
              const createdDate = new Date(userData.created_at)
              if (!isNaN(createdDate.getTime())) {
                const year = createdDate.getFullYear()
                const month = String(createdDate.getMonth() + 1).padStart(2, '0')
                const day = String(createdDate.getDate()).padStart(2, '0')
                userProfile.created_at = `${year}-${month}-${day}`
              }
            }
          } catch (parseError) {
            console.warn('[SpaceFanfou] SidebarStatistics: 解析API响应失败:', parseError)
          }
        }
      } catch (error) {
        console.warn('[SpaceFanfou] SidebarStatistics: 调用API出错:', error)
      }
    }

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
  const { elementCollection, requireModules } = context
  const { proxiedFetch } = requireModules([ 'proxiedFetch' ])

  let unmount

  elementCollection.add({
    stabs: '.stabs',
  })

  return {
    applyWhen: () => isUserProfilePage(),

    waitReady: () => elementCollection.ready('stabs'),

    onLoad() {
      unmount = preactRender(<SidebarStatistics proxiedFetch={proxiedFetch} />, rendered => {
        elementCollection.get('stabs').after(rendered)
      })
    },

    onUnload() {
      unmount()
    },
  }
}
