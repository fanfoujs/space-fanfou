import keepRetry from '@libs/keepRetry'

const CLASSNAME_FEATURE = 'sf-remove-logo-beta'
const RE_BETA_LOGO = /url\("?https?:\/\/static\d?\.fanfou\.com\/img\/fanfou_beta\.(png|svg)"?\)/

export default context => {
  const { elementCollection } = context

  elementCollection.add({
    header: '.global-header-content',
  })

  function getLogoCssBackgroundImage() {
    const { header } = elementCollection.getAll()
    const { backgroundImage } = getComputedStyle(header)

    return backgroundImage
  }

  return {
    applyWhen: () => elementCollection.ready('header'),

    waitReady: () => keepRetry({
      checker: () => getLogoCssBackgroundImage() !== 'none',
      delay: 0, // 减少等待以尽早完成替换，避免出现闪烁
    }),

    onLoad() {
      const isBetaLogo = RE_BETA_LOGO.test(getLogoCssBackgroundImage())

      // 若遇节日 logo，则不予替换
      if (isBetaLogo) document.body.classList.add(CLASSNAME_FEATURE)
    },

    onUnload() {
      document.body.classList.remove(CLASSNAME_FEATURE)
    },
  }
}
