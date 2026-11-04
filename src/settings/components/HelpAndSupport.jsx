import { h, Component } from 'preact'
import ExternalLink from './ExternalLink'
import getExtensionVersion from '@libs/getExtensionVersion'

const URL_OFFICIAL_FANFOU = 'https://fanfou.com/spacefanfou'
const URL_GITHUB = 'https://github.com/fanfoujs/space-fanfou'
const URL_HANDBOOK_FOR_BEGINNERS = 'https://spacekid.me/spacefanfou/'
const URL_ISSUES = 'https://fanfou.com/home?status=%40%E9%94%90%E9%A3%8E%20%40%E5%A4%AA%E7%A9%BA%E5%B0%8F%E5%AD%A9%20%E6%88%91%E5%8F%91%E7%8E%B0%E4%BA%86%E5%A4%AA%E7%A9%BA%E9%A5%AD%E5%90%A6%E7%9A%84%E4%B8%80%E4%B8%AA%E9%97%AE%E9%A2%98%3A'
const URL_SHARE = 'https://fanfou.com/sharer?u=http%3A%2F%2Fis.gd%2Fsfanfou?t=%E5%A4%AA%E7%A9%BA%E9%A5%AD%E5%90%A6%20-%20Chrome%20%E7%BD%91%E4%B8%8A%E5%BA%94%E7%94%A8%E5%BA%97?d=%E5%90%91%E5%A4%A7%E5%AE%B6%E6%8E%A8%E8%8D%90%E5%A4%AA%E7%A9%BA%E9%A5%AD%E5%90%A6%EF%BC%8C%E8%B6%85%E5%BC%BA%E5%A4%A7%E7%9A%84%E9%A5%AD%E5%90%A6%20Chrome%20%E6%B5%8F%E8%A7%88%E5%99%A8%E6%89%A9%E5%B1%95%E7%A8%8B%E5%BA%8F%E3%80%82?s=bl'

const ICON_SIZE = 48

const getFanfouUserProfileUrl = id => `https://fanfou.com/${id}`
const authors = [ {
  id: 'anegie',
  nickname: '太空小孩',
  avatar: 'https://s3.meituan.net/v1/mss_3d027b52ec5a4d589e68050845611e68/avatar/l0/00/3c/7j.jpg',
  desc: (
    <span>
      太空饭否创始人。饭否全新页面外观的主要设计者。<br />
      目前负责太空饭否少量开发和维护工作。
    </span>
  ),
}, {
  id: 'ruif',
  nickname: '锐风',
  avatar: 'https://s3.meituan.net/v1/mss_3d027b52ec5a4d589e68050845611e68/avatar/l0/00/34/d8.jpg',
  desc: (
    <span>
      太空饭否主要开发者。饭否全新页面功能的主要创造者。<br />
      目前负责太空饭否主要开发和维护工作。
    </span>
  ),
}, {
  id: 'lito',
  nickname: '饭小默',
  avatar: 'https://s3.meituan.net/v1/mss_3d027b52ec5a4d589e68050845611e68/avatar/l0/00/9f/1m.jpg',
  desc: (
    <span>
      太空饭否开发者。饭否全新图标的主要设计者。<br />
      目前负责太空饭否主要开发和维护工作。
    </span>
  ),
}, {
  id: 'xidorn',
  nickname: 'Xidorn',
  avatar: 'https://s3.meituan.net/v1/mss_3d027b52ec5a4d589e68050845611e68/avatar/l0/00/vq/0q.jpg',
  desc: (
    <span>
      太空饭否主要开发者。饭否全新页面功能的主要创造者。<br />
      目前已经退出开发工作。
    </span>
  ),
}, {
  id: 'zhasm',
  nickname: '.rex',
  avatar: 'https://s3.meituan.net/v1/mss_3d027b52ec5a4d589e68050845611e68/avatar/l0/00/57/sg.jpg',
  desc: (
    <span>
      太空饭否协作开发者。<br />
      目前负责太空饭否 Chrome 应用商店的疑难解答工作。
    </span>
  ),
} ]

const sections = [ {
  title: '太空饭否',
  items: [ {
    icon: 'icons/icon-256.png',
    url: URL_OFFICIAL_FANFOU,
    title: (
      <span>
        <ExternalLink text="官方饭否" url={URL_OFFICIAL_FANFOU} /> - <ExternalLink text="入门手册" url={URL_HANDBOOK_FOR_BEGINNERS} /> - <ExternalLink text="开源项目" url={URL_GITHUB} /> - <ExternalLink text="报告问题" url={URL_ISSUES} />
      </span>
    ),
    desc: `版本 ${getExtensionVersion()}`,
  } ],
}, {
  title: '太空饭否开发组',
  items: authors.map(author => ({
    icon: author.avatar,
    url: getFanfouUserProfileUrl(author.id),
    title: (
      <span>
        <ExternalLink text={author.nickname} url={getFanfouUserProfileUrl(author.id)} /> ({ author.id })
      </span>
    ),
    desc: author.desc,
  })),
} ]

export default class HelpAndSupport extends Component {
  render() {
    return (
      <div>
        { sections.map(this.renderSection, this) }
        {this.renderFooter()}
      </div>
    )
  }

  renderSection(section) {
    return (
      <div key={section.title}>
        <h3>{ section.title }</h3>
        { section.items.map(this.renderItem, this) }
      </div>
    )
  }

  renderItem({ icon, url, title, desc }) {
    return (
      <div key={url}>
        <div className="left">
          <ExternalLink url={url} className="avatar">
            <img src={icon} width={ICON_SIZE} height={ICON_SIZE} />
          </ExternalLink>
        </div>
        <div className="info left">
          <h4>{ title }</h4>
          <div className="desc">{ desc }</div>
        </div>
        <div className="clear" />
      </div>
    )
  }

  renderFooter() {
    return (
      <footer>
        版权所有 &copy; 2011-{new Date().getFullYear()} <ExternalLink text="太空饭否开发组" url={URL_GITHUB} />。保留所有权利。<br />
        如果你喜欢太空饭否，可以<ExternalLink text="推荐太空饭否" url={URL_SHARE} /><a href="" target="_blank"></a>给你的饭友。<br />
      </footer>
    )
  }
}
