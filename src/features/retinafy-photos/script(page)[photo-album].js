import { isPhotoAlbumPage } from '@libs/pageDetect'
import { THUMBNAIL_PHOTO_WIDTH_LIMIT, THUMBNAIL_PHOTO_HEIGHT_LIMIT, RE_THUMBNAIL_PHOTO_PARAMS } from '@constants'

export default context => {
  const { elementCollection } = context

  elementCollection.add({
    album: '#album',
    images: { selector: '.photo>img', parent: 'album', getAll: true },
  })

  return {
    applyWhen: () => isPhotoAlbumPage(),

    waitReady: () => elementCollection.ready('album'),

    onLoad() {
      for (const photo of elementCollection.get('images')) {
        photo.src = photo.src.replace(RE_THUMBNAIL_PHOTO_PARAMS, `@${THUMBNAIL_PHOTO_WIDTH_LIMIT * 2}w_${THUMBNAIL_PHOTO_HEIGHT_LIMIT * 2}h_1l.jpg`)
        photo.style.maxWidth = `${THUMBNAIL_PHOTO_WIDTH_LIMIT}px`
        photo.style.maxHeight = `${THUMBNAIL_PHOTO_HEIGHT_LIMIT}px`
        photo.style.boxSizing = 'content-box'
      }
    },

    onUnload() {
      // 不需要卸载
    },
  }
}
