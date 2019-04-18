import { h, Component, render } from 'preact'
import wretch from 'wretch'
import select from 'select-dom'
import cx from 'classnames'
import arrayLast from 'array-last'
import sleep from 'p-sleep'
import { CLASSNAME_CONTAINER } from './constants'
import { isTimelinePage } from '@libs/pageDetect'
import requireFanfouLib from '@libs/requireFanfouLib'
import extractText from '@libs/extractText'
import { fadeOut } from '@libs/fade'
import isStatusElement from '@libs/isStatusElement'
import isElementInDocument from '@libs/isElementInDocument'
import every from '@libs/promiseEvery'

const ATTRIBUTE_CACHE_ID = 'sf-contextual-statuses'

export default context => {
  const { readOptionValue, requireModules, elementCollection } = context
  const { timelineElementObserver } = requireModules([ 'timelineElementObserver' ])

  const cacheMap = new Map()
  let cacheIdGen = 0

  elementCollection.add({
    stream: '#stream',
  })

  class ContextualStatus extends Component {
    render() {
      const { isLast } = this.props

      return (
        <li className={cx('unlight', { 'sf-last': isLast })} />
      )
    }

    componentDidMount() {
      const li = this.base

      // 在这里而不是在 render 里使用 dangerouslySetInnerHTML，可以避免闪烁
      li.innerHTML = this.props.html

      window.FF.app.Stream.attach(li)

      if (this.props.hasPhoto) {
        window.FF.app.Zoom.init(li)
      }
    }
  }

  class ContextualStatuses extends Component {
    constructor(props) {
      super(props)

      this.initialState = {
        hasMore: true,
        pendingNumber: 0,
        nextStatusId: props.initialStatusId,
        unavailableReason: '',
        isWaiting: false,
        statuses: [],
      }

      this.state = { ...this.initialState }
    }

    async fetchNextNStatuses(pendingNumber) {
      this.setState(() => ({ pendingNumber }))

      if (pendingNumber > 0 && this.state.hasMore) {
        await this.fetchNextStatus()
        await sleep(400)

        this.fetchNextNStatuses(pendingNumber - 1)
      }
    }

    fetchNextNStatusesPerConfig = () => {
      this.fetchNextNStatuses(readOptionValue('fetchStatusNumberPerClick'))
    }

    resetState = () => {
      this.setState(this.initialState)
    }

    fetchNextStatus = async () => {
      this.setState({ isWaiting: true })

      const statusPageHtml = await fetchStatusPageHtml(this.state.nextStatusId)
      const { statusHtml, unavailableReason, nextStatusId, hasPhoto } = processStatusPageHtml(statusPageHtml)

      if (unavailableReason) {
        this.setState({
          hasMore: false,
          unavailableReason,
        })
      } else {
        this.setState(state => ({
          hasMore: !!nextStatusId,
          nextStatusId,
          statuses: [ ...state.statuses, {
            isLast: !nextStatusId,
            html: statusHtml,
            hasPhoto,
          } ],
        }))
      }

      this.setState({ isWaiting: false })
    }

    renderToggle() {
      if (!this.state.hasMore && !this.state.statuses.length) {
        return null
      }

      if (this.state.isWaiting && !this.state.statuses.length) {
        return null
      }

      if (this.state.statuses.length) {
        return (
          <button className="sf-toggle sf-animation-off" onClick={this.resetState}>
            隐藏原文
          </button>
        )
      }

      const text = this.props.type === 'repost'
        ? '转自'
        : '展开'

      return (
        <button className={`sf-toggle sf-${this.props.type}`} onClick={this.fetchNextNStatusesPerConfig}>
          { text }
        </button>
      )
    }

    renderStatuses() {
      return (
        <div className="sf-contextual-statuses">
          { this.state.statuses.map((props, i) => <ContextualStatus key={i} {...props} />) }
        </div>
      )
    }

    renderIndicator() {
      if (this.state.isWaiting && this.state.pendingNumber > 0) {
        return (
          <button className="sf-indicator sf-waiting sf-animation-off" />
        )
      }

      if (!this.state.hasMore && this.state.unavailableReason) {
        return (
          <button className="sf-indicator sf-not-available">{ this.state.unavailableReason }</button>
        )
      }

      if (this.state.hasMore && this.state.statuses.length) {
        return (
          <button className="sf-indicator" onClick={this.fetchNextNStatusesPerConfig}>继续展开</button>
        )
      }
    }

    render() {
      return (
        <div className={CLASSNAME_CONTAINER}>
          { this.renderToggle() }
          { this.renderStatuses() }
          { this.renderIndicator() }
        </div>
      )
    }

    componentDidMount() {
      if (readOptionValue('autoFetch')) {
        this.fetchNextStatus()
      }
    }
  }

  function fetchStatusPageHtml(statusId) {
    return wretch(`/statuses/${statusId}`).get().text()
  }

  function processStatusPageHtml(statusPageHtml) {
    const { avatar, author, other } = extractText(statusPageHtml, [
      { key: 'avatar', opening: '<div id="avatar">', closing: '</div>' },
      { key: 'author', opening: '<h1>', closing: '</h1>' },
      { key: 'other', opening: /<h2( class="deleted")?>/, closing: '</h2>' },
    ])
    const statusHtml = (
      avatar.replace('<a', '<a class="avatar"') +
      author.replace('<a', '<a class="author"') +
      other.replace(' redirect="/home"', '') // 删除按钮带有这个 attribute
    )
    let unavailableReason
    let nextStatusId
    let hasPhoto = false

    if (other.includes('我只向关注我的人公开我的消息')) {
      unavailableReason = '未公开'
    } else if (other.includes('此消息已被删除')) {
      unavailableReason = '已删除'
    } else {
      nextStatusId = other.match(/<span class="reply"><a href="\/statuses\/(.+?)">.+<\/a><\/span>/)?.[1]
      hasPhoto = other.includes('<img ')
    }

    return { statusHtml, unavailableReason, nextStatusId, hasPhoto }
  }

  function getCacheId(li) {
    let cacheId

    if (li.hasAttribute(ATTRIBUTE_CACHE_ID)) {
      cacheId = parseInt(li.getAttribute(ATTRIBUTE_CACHE_ID), 10)
    } else {
      cacheId = cacheIdGen++
      li.setAttribute(ATTRIBUTE_CACHE_ID, cacheId)
    }

    return cacheId
  }


  function hasContextualStatuses(li) {
    return select.exists('.stamp .reply a', li)
  }

  function onStatusAdded(li) {
    // 被删除的可能是我们插入进去的 `sf-contextual-statuses-container`
    if (!isStatusElement(li)) return
    // 必须是回复或转发消息，否则忽略
    if (!hasContextualStatuses(li)) return

    const cacheId = getCacheId(li)

    // 饭否在加载下一页消息后，会直接使用 innerHTML 的方式覆写当前 HTML
    // 这就导致原本存在的 DOM 结构被替换掉
    // MutationObserver 的 mutationRecord.addedNodes 中会包含旧消息
    // 而这些旧消息中已经展开了的部分所绑定的监听事件会丢失，也就是「dead instance」
    // 我们用原来可以交互的实例（alive instance）替换掉新的实例
    if (cacheMap.has(cacheId)) {
      const aliveInstance = cacheMap.get(cacheId)
      const maybeDeadInstance = li.nextElementSibling

      if (maybeDeadInstance?.matches(`.${CLASSNAME_CONTAINER}`)) {
        maybeDeadInstance.replaceWith(aliveInstance)
      }

      return
    }

    const replyLink = select('.stamp .reply a', li)
    const props = {
      type: replyLink.textContent.startsWith('转自')
        ? 'repost'
        : 'reply',
      initialStatusId: arrayLast(replyLink.href.split('/')),
    }
    const instance = render(<ContextualStatuses {...props} />, document.body)

    // 调整插入位置
    li.after(instance)
    cacheMap.set(cacheId, instance)
  }

  async function onStatusRemoved(li) {
    if (!isStatusElement(li)) return
    if (!hasContextualStatuses(li)) return

    const { stream } = elementCollection.getAll()
    const cacheId = getCacheId(li)

    // 饭否载入新消息的方式是，直接修改 innerHTML，这会导致原来存在的消息被重新渲染
    // 原来存在的消息的 DOM 元素会被删除，然后出现新的完全相同 HTML 结构的 DOM 元素
    // 我们需要判断是否为这种情况
    if (select.exists(`[${ATTRIBUTE_CACHE_ID}="${cacheId}"]`, stream)) return

    if (cacheMap.has(cacheId)) {
      const instance = cacheMap.get(cacheId)
      const elements = select.all('button, li', instance)

      // 如果已经不存在于 DOM 中，则不需要出场动画等操作
      if (isElementInDocument(instance)) {
        // 按钮、展开的消息按顺序逐一播放淡出动画
        while (elements.length) {
          const element = elements.shift()

          await fadeOut(element, 400)
          element.remove()
        }

        // 动画结束后，删除最外层容器
        instance.remove()
      }

      cacheMap.delete(cacheId)
    }
  }

  function mutationObserverCallback(mutationRecords) {
    for (const { addedNodes, removedNodes } of mutationRecords) {
      for (const addedNode of addedNodes) {
        onStatusAdded(addedNode)
      }

      for (const removedNode of removedNodes) {
        onStatusRemoved(removedNode)
      }
    }
  }

  return {
    applyWhen: () => isTimelinePage(),

    waitReady: () => every([
      requireFanfouLib('jQuery'),
      requireFanfouLib('FF.app.Stream'),
      requireFanfouLib('FF.app.Zoom'),
    ]),

    onLoad() {
      timelineElementObserver.addCallback(mutationObserverCallback)
    },

    onUnload() {
      timelineElementObserver.removeCallback(mutationObserverCallback)
      cacheMap.clear()

      for (const li of select.all(`[${ATTRIBUTE_CACHE_ID}]`)) {
        li.removeAttribute(ATTRIBUTE_CACHE_ID)
      }

      for (const container of select.all(`.${CLASSNAME_CONTAINER}`)) {
        container.remove()
      }
    },
  }
}
