import transformUrl from 'transform-url'

export default () => {
  // 参考：https://static.fanfou.com/js/bm_img_share.js

  const menuIds = []
  // Manifest V3: 不能在 create() 中使用 onclick，必须使用 onClicked 事件
  const menuItems = [ {
    id: 'share-to-fanfou-page',
    title: '分享到饭否',
    contexts: [ 'page', 'selection' ],
  // TODO: 拿不到链接标题
  // }, {
  //   id: 'share-to-fanfou-link',
  //   title: '分享链接到饭否',
  //   contexts: [ 'link' ],
  }, {
    id: 'share-to-fanfou-image',
    title: '分享图片到饭否',
    contexts: [ 'image' ],
  } ]

  function createSharerPopup(url, height) {
    // Service Worker 兼容：使用 chrome.windows.create 替代 window.open
    chrome.windows.create({
      url,
      type: 'popup',
      width: 640,
      height,
    })
  }

  // Manifest V3: 使用 onClicked 事件监听器处理点击
  function handleMenuClick(info, tab) {
    let url
    let height = 440

    switch (info.menuItemId) {
      case 'share-to-fanfou-page':
        url = transformUrl('https://fanfou.com/sharer', {
          u: tab.url,
          t: tab.title,
          d: info.selectionText || '',
        })
        height = 440
        break

      case 'share-to-fanfou-image':
        url = transformUrl('https://fanfou.com/sharer/image', {
          u: tab.url,
          t: tab.title,
          img_src: info.srcUrl, // eslint-disable-line camelcase
        })
        height = 540
        break

      default:
        return
    }

    createSharerPopup(url, height)
  }

  function registerMenuItems() {
    for (const menuItem of menuItems) {
      chrome.contextMenus.create(menuItem, () => {
        if (chrome.runtime.lastError) {
          console.error('[SpaceFanfou] 创建上下文菜单失败:', chrome.runtime.lastError.message)
        } else {
          menuIds.push(menuItem.id)
        }
      })
    }

    // 注册点击事件监听器
    chrome.contextMenus.onClicked.addListener(handleMenuClick)
  }

  function unregisterMenuItems() {
    // 移除点击事件监听器
    chrome.contextMenus.onClicked.removeListener(handleMenuClick)

    menuIds.forEach(menuId => chrome.contextMenus.remove(menuId))
    menuIds.length = 0
  }

  return {
    onLoad() {
      registerMenuItems()
    },

    onUnload() {
      unregisterMenuItems()
    },
  }
}
