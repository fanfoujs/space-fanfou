// import wretch from 'wretch'
import { h } from 'dom-chef'
import select from 'select-dom'
import cx from 'classnames'
// import parseHTML from '@libs/parseHTML'
import compareDomains from '@libs/compareDomains'
import prependElement from '@libs/prependElement'

function isStatusHasPhoto(li) {
  return select.exists(':scope > .content > .photo.zoom', li)
}

function addPhotoToStatus(li, { isGIF = false, thumbnailUrl, originalUrl }) {
  if (isStatusHasPhoto(li)) return

  const content = select(':scope > .content', li)
  const link = (
    <a href={originalUrl} className={cx('photo', 'zoom', { gif: isGIF })}>
      <img src={thumbnailUrl} />
      <span />
    </a>
  )

  prependElement(content, link)

  // 如果在页面加载过程中就插入了图片，饭否此时还没有初始化。
  // 饭否会在初始化时一并给这里插入的图片启用 Zoom，我们不该重复启用 Zoom。
  // 但是饭否初始化完成之后，再插入图片就得我们自己手工去启用 Zoom 了。
  if (window.YAHOO?.util?.Event?.DOMReady) {
    window.FF.app.Zoom.init(li)
  }

  // TOOD: 处理图片比例过长的情况
}

function convertToHttps(url) {
  return url.replace(/^http:\/\//, 'https://')
}

// async function loadDOM(url) {
//   const html = await wretch(url).options({ mode: 'no-cors' }).get().text()
//   const document = parseHTML(html)
//
//   return document
// }

// TODO: 现在 Chrome 对跨域限制非常严格，暂时没有绕过的办法，即便放到后台去请求也不行
export default [ {
//   id: 'netease-cloud-music-cover-image',
//   isMatchingUrl: ({ parsedUrl }) => (
//     parsedUrl.domain === 'music.163.com' &&
//     [ '/album', '/song', '/playlist' ].includes(parsedUrl.pathname) &&
//     parsedUrl.query.id
//   ),
//   async extractData({ url }) {
//     const document = await loadDOM(url)
//     return {}
//   },
//   applyData() {},
// }, {
  id: 'weibo-image',
  isMatchingUrl: ({ parsedUrl }) => (
    compareDomains(parsedUrl.domain, 'sinaimg.cn') &&
    parsedUrl.pathname.endsWith('.jpg')
  ),
  extractData({ url, parsedUrl }) {
    const size = parsedUrl.pathname.split('/')[1]

    return {
      // 新浪只能使用预指定的几个图片参数，不能自己随意设置
      // TODO: 这个缩略图是方形的，如果原图是长图，将不会默认在新页面打开
      thumbnailUrl: convertToHttps(url).replace(size, `thumb300`),
      originalUrl: convertToHttps(url).replace(size, 'large'),
    }
  },
  applyData: addPhotoToStatus,
}, {
  id: 'image',
  isMatchingUrl: ({ parsedUrl }) => (
    parsedUrl.pathname.endsWith('.jpg') ||
    parsedUrl.pathname.endsWith('.jpeg') ||
    parsedUrl.pathname.endsWith('.png') ||
    parsedUrl.pathname.endsWith('.gif') ||
    parsedUrl.pathname.endsWith('.webm') ||
    parsedUrl.pathname.endsWith('.bmp')
  ),
  extractData({ url, parsedUrl }) {
    return {
      isGIF: parsedUrl.pathname.endsWith('.gif'),
      thumbnailUrl: url,
      originalUrl: url,
    }
  },
  applyData: addPhotoToStatus,
} ]
