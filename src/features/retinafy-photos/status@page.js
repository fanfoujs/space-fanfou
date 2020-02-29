import { isStatusPage } from '@libs/pageDetect'
import every from '@libs/promiseEvery'
import { processStatus } from './shared'

export default context => {
  const { elementCollection } = context

  elementCollection.add({
    status: '.msg',
  })

  return {
    applyWhen: () => every([
      isStatusPage(),
      elementCollection.ready('status'),
    ]),

    onLoad() {
      processStatus(elementCollection.get('status'))
    },

    onUnload() {
      // 不需要卸载
    },
  }
}
