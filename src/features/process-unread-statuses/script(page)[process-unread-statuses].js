import createActivityDetector from 'activity-detector'
import select from 'select-dom'
import isVisible from 'is-visible'
import getLoggedInUserProfilePageUrl from '@libs/getLoggedInUserProfilePageUrl'
import safeElementReady from '@libs/safeElementReady'

export default context => {
  const { readOptionValue, requireModules, elementCollection, registerDOMEventListener } = context
  const { scrollManager, statusFormIntersectionObserver, proxiedAudio } = requireModules([
    'scrollManager',
    'statusFormIntersectionObserver',
    'proxiedAudio',
  ])
  const activityDetector = createActivityDetector({ autoInit: false })

  let previousCount = 0
  let isUserActive = true
  let mutationObserver
  let isStatusFormIntersected = scrollManager.getScrollTop() === 0

  elementCollection.add({
    timelineNotification: '#timeline-notification',
    showUnreadStatusesButton: '#timeline-notification > a',
    timelineCount: '#timeline-count',
  })

  registerDOMEventListener('showUnreadStatusesButton', 'click', onClickButton)

  activityDetector.on('active', () => isUserActive = true)
  activityDetector.on('idle', () => isUserActive = false)

  function getUnreadStatusesCounts() {
    const bufferedStatuses = select.all('#stream > ol > li.buffered')
    const myStatuses = bufferedStatuses.filter(element => {
      const author = select('.author', element)

      return author.href === getLoggedInUserProfilePageUrl()
    })

    return {
      myStatusesCount: myStatuses.length,
      restStatusesCount: bufferedStatuses.length - myStatuses.length,
    }
  }

  function showBufferedStatuses() {
    elementCollection.get('showUnreadStatusesButton').click()
  }

  function playSound() {
    if (!readOptionValue('playSound')) return

    const audioUrl = require('@assets/sounds/dingdong.mp3')

    proxiedAudio.play(audioUrl)
  }

  function processUnreadStatuses() {
    if (!isVisible(elementCollection.get('timelineNotification'))) return

    const { myStatusesCount, restStatusesCount } = getUnreadStatusesCounts()

    // 当页面位于顶部，且所有未读消息均为自己的消息时
    if (isStatusFormIntersected && myStatusesCount && !restStatusesCount) {
      showBufferedStatuses()
    // 出现了新的且非自己的消息时
    } else if (restStatusesCount > previousCount) {
      // 如果用户不活跃（页面失焦或者用户长时间无操作）或者页面滚动到靠下的位置
      if (!isUserActive || !isStatusFormIntersected) playSound()
      previousCount = restStatusesCount
    }
  }

  function onClickButton() {
    previousCount = 0
  }

  function intersectionObserverCallback(isIntersected) {
    isStatusFormIntersected = isIntersected
    processUnreadStatuses()
  }

  return {
    applyWhen: () => elementCollection.ready('timelineNotification'),

    waitReady: () => safeElementReady('#stream'),

    onLoad() {
      statusFormIntersectionObserver.addListener(intersectionObserverCallback)

      mutationObserver = new MutationObserver(() => processUnreadStatuses())
      mutationObserver.observe(
        elementCollection.get('timelineCount'),
        { childList: true },
      )

      activityDetector.init()

      previousCount = getUnreadStatusesCounts().restStatusesCount
    },

    unload() {
      statusFormIntersectionObserver.removeListener(intersectionObserverCallback)

      mutationObserver.disconnect()
      mutationObserver = null

      activityDetector.stop()
    },
  }
}
