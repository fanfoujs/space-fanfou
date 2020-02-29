import { isPhotoEntryPage } from '@libs/pageDetect'
import every from '@libs/promiseEvery'

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

      photo.src = photo.src.replace(/@596w_1l\.jpg$/, '')
      photo.style.maxWidth = '596px'
    },

    onUnload() {
      // 不需要卸载
    },
  }
}
