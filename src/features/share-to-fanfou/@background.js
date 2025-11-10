import transformUrl from 'transform-url'

export default () => {
  // 参考：https://static.fanfou.com/js/bm_img_share.js

  const menuIds = []
  const menuItems = [ {
    id: 'share-to-fanfou-page',  // Manifest V3: 必须指定 id
    title: '分享到饭否',
    contexts: [ 'page', 'selection' ],
    onclick(info, tab) {
      const url = transformUrl('https://fanfou.com/sharer', {
        u: tab.url,
        t: tab.title,
        d: info.selectionText || '',
      })

      createSharerPopup(url, 440)
    },
  // TODO: 拿不到链接标题
  // }, {
  //   id: 'share-to-fanfou-link',
  //   title: '分享链接到饭否',
  //   contexts: [ 'link' ],
  //   onclick(info) {
  //     const url = transformUrl('https://fanfou.com/sharer', {
  //       u: info.linkUrl,
  //       t: info.linkTitle,
  //     })
  //
  //     createSharerPopup(url)
  //   },
  }, {
    id: 'share-to-fanfou-image',  // Manifest V3: 必须指定 id
    title: '分享图片到饭否',
    contexts: [ 'image' ],
    onclick(info, tab) {
      const url = transformUrl('https://fanfou.com/sharer/image', {
        u: tab.url,
        t: tab.title,
        img_src: info.srcUrl, // eslint-disable-line camelcase
      })

      createSharerPopup(url, 540)
    },
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

  function registerMenuItems() {
    for (const menuItem of menuItems) {
      // Manifest V3: create() 不再返回 menuId（因为我们已经指定了 id）
      chrome.contextMenus.create(menuItem, () => {
        if (chrome.runtime.lastError) {
          console.error('[SpaceFanfou] 创建上下文菜单失败:', chrome.runtime.lastError.message)
        } else {
          menuIds.push(menuItem.id)
        }
      })
    }
  }

  function unregisterMenuItems() {
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
