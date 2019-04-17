import { h, Component } from 'preact'
import select from 'select-dom'
import cx from 'classnames'
import clamp from 'just-clamp'
import retry from 'p-retry'
import Tooltip from '@libs/Tooltip'
import jsonp from '@libs/jsonp'
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

  async componentWillMount() {
    const userProfile = await this.fetchUserProfileData()
    this.processData(userProfile)
  }

  getUserId() {
    const metaContent = select('meta[name=author]').content
    const userId = metaContent.match(/\((.+)\)/)[1]

    return userId
  }

  async fetchUserProfileData() {
    const apiUrl = '//api.fanfou.com/users/show.json'
    const params = { id: this.getUserId() }
    const fetch = () => jsonp(apiUrl, { params })
    const userProfileData = await retry(fetch, {
      retries: 3,
      minTimeout: 250,
    })

    return userProfileData
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
    // 需要检测用户是否在“设置→模板”中选择了“不要背景图片”
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
    applyWhen: () => isUserProfilePage(),

    waitReady: () => elementCollection.ready('stabs'),

    onLoad() {
      unmount = preactRender(<SidebarStatistics />, root => {
        elementCollection.get('stabs').after(root)
      })
    },

    onUnload() {
      unmount()
    },
  }
}
