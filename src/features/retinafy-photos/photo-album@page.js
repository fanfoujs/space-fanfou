import { isPhotoAlbumPage } from '@libs/pageDetect'

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
        photo.src = photo.src.replace(/@120w_120h_1l\.jpg$/, '@240w_240h_1l.jpg')
        photo.style.maxWidth = photo.style.maxHeight = '120px'
        photo.style.boxSizing = 'content-box'
      }
    },

    onUnload() {
      // 不需要卸载
    },
  }
}
