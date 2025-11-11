import { processStatus } from './shared'
import { isTimelinePage } from '@libs/pageDetect'

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
