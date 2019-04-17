const CLASSNAME_FEATURE = 'sf-remove-logo-beta'
const RE_BETA_LOGO = /url\("?https?:\/\/static\d?\.fanfou\.com\/img\/fanfou_beta\.(png|svg)"?\)/

export default context => {
  const { elementCollection } = context

  elementCollection.add({
    header: '.global-header-content',
  })

  return {
    applyWhen: () => elementCollection.ready('header'),

    onLoad() {
      const { header } = elementCollection.getAll()
      const originalCssBgImg = getComputedStyle(header).backgroundImage
      const isBetaLogo = RE_BETA_LOGO.test(originalCssBgImg)

      // 若遇节日 logo，则不予替换
      if (isBetaLogo) document.body.classList.add(CLASSNAME_FEATURE)
    },

    onUnload() {
      document.body.classList.remove(CLASSNAME_FEATURE)
    },
  }
}
