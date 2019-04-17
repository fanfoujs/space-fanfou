import select from 'select-dom'
import { isTimelinePage } from '@libs/pageDetect'
import { RE_ORIGINAL_PHOTO_PARAMS } from '@constants'

function processStatus(li) {
  const photo = select('a.photo.zoom', li)

  if (photo) photo.href = photo.href.replace(RE_ORIGINAL_PHOTO_PARAMS, '')
}

function mutationObserverCallback(mutationRecords) {
  for (const { addedNodes } of mutationRecords) {
    for (const li of addedNodes) processStatus(li)
  }
}

export default context => {
  const { requireModules } = context
  const { timelineElementObserver } = requireModules([ 'timelineElementObserver' ])

  return {
    applyWhen: () => isTimelinePage(),

    onLoad() {
      timelineElementObserver.addCallback(mutationObserverCallback)
    },

    onUnload() {
      timelineElementObserver.removeCallback(mutationObserverCallback)
    },
  }
}
