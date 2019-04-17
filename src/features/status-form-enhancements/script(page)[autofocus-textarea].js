// #phupdate textarea 为首页发送消息的输入框
// 当页面滚动到较下部的位置时，使输入框失焦；当页面滚动到较上部的位置时，使输入框重新获得焦点
// 好处是，当页面处于较下部位置时，方便使用快捷键返回页面顶部
// 而不是在一个不可见但是拥有焦点的输入框里输入文字

export default context => {
  const { requireModules, elementCollection } = context
  const { statusFormIntersectionObserver } = requireModules([ 'statusFormIntersectionObserver' ])

  elementCollection.add({
    textarea: '#phupdate textarea',
  })

  function intersectionObserverCallback(isIntersected) {
    if (isIntersected) {
      elementCollection.get('textarea').focus()
    } else if (isEmpty()) {
      elementCollection.get('textarea').blur()
    }
  }

  function isEmpty() {
    return elementCollection.get('textarea').value === ''
  }

  return {
    applyWhen: () => elementCollection.ready('textarea'),

    onLoad() {
      statusFormIntersectionObserver.addListener(intersectionObserverCallback)
    },

    onUnload() {
      statusFormIntersectionObserver.removeListener(intersectionObserverCallback)
    },
  }
}
