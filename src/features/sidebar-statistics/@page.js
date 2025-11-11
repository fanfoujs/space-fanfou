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
import getCurrentPageOwnerUserId from '@libs/getCurrentPageOwnerUserId'

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

    // 3. 获取注册日期（从饭否API）
    console.log('[SpaceFanfou] SidebarStatistics: 开始提取注册日期')

    // 3.1 尝试通过饭否API获取注册时间
    const { proxiedFetch } = this.props
    if (proxiedFetch) {
      try {
        const userId = await getCurrentPageOwnerUserId()
        console.log('[SpaceFanfou] SidebarStatistics: 当前用户ID:', userId)

        // 调用饭否API获取用户信息
        const apiUrl = `http://api.fanfou.com/users/show.json`
        const query = { id: userId, mode: 'lite' }
        console.log('[SpaceFanfou] SidebarStatistics: 请求API:', apiUrl, query)

        const { error: ajaxError, responseText: jsonText } = await proxiedFetch.get({
          url: apiUrl,
          query,
        })

        if (ajaxError) {
          console.warn('[SpaceFanfou] SidebarStatistics: API请求失败:', ajaxError)
        } else if (jsonText) {
          try {
            const userData = JSON.parse(jsonText)
            console.log('[SpaceFanfou] SidebarStatistics: API返回数据:', userData)

            if (userData.created_at) {
              // API返回的格式："Sat Jun 09 23:56:33 +0000 2007"
              // 转换为 YYYY-MM-DD 格式
              const createdDate = new Date(userData.created_at)
              if (!isNaN(createdDate.getTime())) {
                const year = createdDate.getFullYear()
                const month = String(createdDate.getMonth() + 1).padStart(2, '0')
                const day = String(createdDate.getDate()).padStart(2, '0')
                userProfile.created_at = `${year}-${month}-${day}`
                console.log('[SpaceFanfou] SidebarStatistics: 从API成功提取注册日期:', userProfile.created_at)
              } else {
                console.warn('[SpaceFanfou] SidebarStatistics: API返回的日期格式无法解析:', userData.created_at)
              }
            } else {
              console.warn('[SpaceFanfou] SidebarStatistics: API返回数据中没有created_at字段')
            }
          } catch (parseError) {
            console.warn('[SpaceFanfou] SidebarStatistics: 解析API响应失败:', parseError, jsonText)
          }
        }
      } catch (error) {
        console.warn('[SpaceFanfou] SidebarStatistics: 调用API出错:', error)
      }
    }

    // 3.2 如果API没有获取到，再尝试从桌面版 #user_infos 获取（备用方案）
    if (!userProfile.created_at) {
      console.log('[SpaceFanfou] SidebarStatistics: API未获取到注册时间，尝试从桌面版 #user_infos 获取')
      const userInfos = select('#user_infos')

      if (!userInfos) {
        console.warn('[SpaceFanfou] SidebarStatistics: 未找到 #user_infos 元素')
      } else {
        console.log('[SpaceFanfou] SidebarStatistics: #user_infos 元素已找到')
        const items = userInfos.querySelectorAll('li')
        console.log(`[SpaceFanfou] SidebarStatistics: 找到 ${items.length} 个 li 元素`)

        let found = false
        items.forEach((item, index) => {
          if (found) return // 已找到，跳过剩余项

          const text = item.textContent.trim()
          console.log(`[SpaceFanfou] SidebarStatistics: li[${index}] 内容:`, text)

          // 尝试多种日期格式匹配
          const patterns = [
            // 标准格式：注册于：2010-01-01 或 注册于: 2010-01-01
            { regex: /注册于[：:]\s*(\d{4}[-]\d{1,2}[-]\d{1,2})/, groups: 1 },
            // 中文格式：注册于：2010年1月1日
            { regex: /注册于[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日?/, groups: 3 },
            // 无冒号格式：注册于 2010-01-01
            { regex: /注册于\s+(\d{4}[-]\d{1,2}[-]\d{1,2})/, groups: 1 },
            // 无冒号中文格式：注册于 2010年1月1日
            { regex: /注册于\s+(\d{4})年(\d{1,2})月(\d{1,2})日?/, groups: 3 },
            // 兼容老格式（混合年月分隔符）
            { regex: /注册于[：:]\s*(\d{4})[-年](\d{1,2})[-月](\d{1,2})日?/, groups: 3 },
            // 更宽松的格式（任意分隔符）
            { regex: /注册于[：:\s]*(\d{4})[\s年/-](\d{1,2})[\s月/-](\d{1,2})/, groups: 3 },
          ]

          for (const { regex, groups } of patterns) {
            const match = text.match(regex)
            if (match) {
              console.log('[SpaceFanfou] SidebarStatistics: 正则匹配成功', {
                pattern: regex.source,
                match: match.slice(0, groups + 1),
              })

              let dateStr
              if (groups === 1) {
                // 简单格式：直接匹配到完整日期字符串
                dateStr = match[1]
              } else if (groups === 3) {
                // 分组格式：年、月、日分别匹配
                const year = match[1]
                const month = match[2].padStart(2, '0')
                const day = match[3].padStart(2, '0')
                dateStr = `${year}-${month}-${day}`
              }

              if (dateStr) {
                // 验证日期有效性
                const testDate = new Date(dateStr)
                if (!isNaN(testDate.getTime())) {
                  userProfile.created_at = dateStr
                  console.log('[SpaceFanfou] SidebarStatistics: 成功提取注册日期:', dateStr)
                  found = true
                  return // 找到有效日期后退出
                } else {
                  console.warn('[SpaceFanfou] SidebarStatistics: 日期格式无效:', dateStr)
                }
              }
              break // 匹配成功但日期无效，继续尝试下一个正则
            }
          }
        })
      }
    }

    // 4. 如果没有找到注册日期，使用估算（从 meta 标签或默认值）
    if (!userProfile.created_at) {
      console.warn('[SpaceFanfou] SidebarStatistics: 未能提取到注册日期，使用默认值 2010-01-01')
      console.warn('[SpaceFanfou] SidebarStatistics: 请检查页面HTML结构是否改变')
      console.warn('[SpaceFanfou] SidebarStatistics: 建议检查 #user_infos 元素中的实际内容')
      // 默认使用一个合理的日期（2010年，饭否重新上线的年份）
      userProfile.created_at = '2010-01-01'
    } else {
      console.log('[SpaceFanfou] SidebarStatistics: 最终注册日期:', userProfile.created_at)
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
  const { elementCollection, requireModules } = context
  const { proxiedFetch } = requireModules([ 'proxiedFetch' ])

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
      unmount = preactRender(<SidebarStatistics proxiedFetch={proxiedFetch} />, rendered => {
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
