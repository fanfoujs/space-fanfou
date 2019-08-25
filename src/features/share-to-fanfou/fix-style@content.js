import { isSharePage } from '@libs/pageDetect'

export default () => ({
  applyWhen: () => isSharePage(),
})
