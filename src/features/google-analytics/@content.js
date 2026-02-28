import loadAsset, { appendToRoot } from '@libs/loadAsset'

const GOOGLE_ANALYTICS_BOOTSTRAP_URL = chrome.runtime.getURL('google-analytics-bootstrap.js')

export default () => ({
  onLoad() {
    if (process.env.NODE_ENV === 'production') {
      loadAsset({ type: 'script', url: GOOGLE_ANALYTICS_BOOTSTRAP_URL, mount: appendToRoot }).remove()
    }
  },
})
