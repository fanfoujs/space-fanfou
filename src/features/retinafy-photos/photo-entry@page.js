import { isPhotoEntryPage } from '@libs/pageDetect'
import every from '@libs/promiseEvery'
import { ORIGINAL_PHOTO_WIDTH_LIMIT, RE_ORIGINAL_PHOTO_PARAMS } from '@constants'

export default context => {
  const { elementCollection } = context

  elementCollection.add({
    photo: '#photo img',
  })

  return {
    applyWhen: () => every([
      isPhotoEntryPage(),
      elementCollection.ready('photo'), // 如果用户加锁，照片则不存在
    ]),

    onLoad() {
      const photo = elementCollection.get('photo')

      photo.src = photo.src.replace(RE_ORIGINAL_PHOTO_PARAMS, '')
      photo.style.maxWidth = `${ORIGINAL_PHOTO_WIDTH_LIMIT}px`
      photo.style.boxSizing = 'border-box'
    },

    onUnload() {
      // 不需要卸载
    },
  }
}
