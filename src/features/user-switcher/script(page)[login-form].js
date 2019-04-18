import { isLoginPage } from '@libs/pageDetect'

export default context => {
  const { elementCollection } = context

  let originalAutoLoginLabel

  elementCollection.add({
    login: '#login',
    al: '#autologin',
  })

  return {
    applyWhen: () => isLoginPage(),

    waitReady: () => elementCollection.ready('login'),

    onLoad() {
      elementCollection.get('al').checked = true
      originalAutoLoginLabel = elementCollection.get('al').nextSibling.textContent
      elementCollection.get('al').nextSibling.textContent = ' 保存到「多账户切换列表」'
    },

    onUnload() {
      elementCollection.get('al').nextSibling.textContent = originalAutoLoginLabel
      originalAutoLoginLabel = null
    },
  }
}
