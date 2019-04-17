import wretch from 'wretch'
import blobToBase64 from '@libs/blobToBase64'

const STORAGE_KEY = 'new-avatar-base64-temp'
const STORAGE_AREA_NAME = 'session'
const MESSAGE_CONFIRMING = '是否发表消息向大家分享你的新头像？'
const MESSAGE_POSTING = '正在发布消息……'
const MESSAGE_SUCCESS = '分享成功！'
const MESSAGE_FAILURE = '发送失败'

export default context => {
  const { requireModules, elementCollection, registerDOMEventListener } = context
  const { storage, notification } = requireModules([ 'storage', 'notification' ])

  elementCollection.add({
    form: '#setpicture',
    fileControl: '#pro_bas_picture',
  })

  registerDOMEventListener('form', 'submit', onFormSubmit)

  async function onFormSubmit() {
    const file = elementCollection.get('fileControl').files[0]
    const avatarBase64Temp = file && await blobToBase64(file)

    // 不在表单提交后发布新头像的消息，因为使用的是非 AJAX 表单
    // 表单提交成功后会刷新页面，这段时间可能不足以完成发布消息
    // 页面刷新后会尝试读取保存下来的头像，如果存在则询问是否发布消息
    if (avatarBase64Temp) {
      await storage.write(STORAGE_KEY, avatarBase64Temp, STORAGE_AREA_NAME)
    }
  }

  async function uploadCachedAvatar() {
    const cachedAvatarBase64 = await storage.read(STORAGE_KEY, STORAGE_AREA_NAME)
    if (!cachedAvatarBase64) return

    // eslint-disable-next-line no-alert
    if (window.confirm(MESSAGE_CONFIRMING)) {
      notification.create(notification.INFO, MESSAGE_POSTING)

      const data = {
        ajax: 'yes',
        action: 'photo.upload',
        token: elementCollection.get('form').token.value,
        desc: '我刚刚上传了新头像',
        photo_base64: cachedAvatarBase64, // eslint-disable-line camelcase
      }
      let ajaxError

      try {
        await wretch('/home/upload').formData(data).post()
      } catch (error) {
        ajaxError = error
      }

      if (ajaxError) {
        notification.create(notification.INFO, MESSAGE_FAILURE)
      } else {
        notification.create(notification.INFO, MESSAGE_SUCCESS)
      }
    }

    // 不论是否上传成功，都删除新头像缓存
    await storage.delete(STORAGE_KEY, STORAGE_AREA_NAME)
  }

  return {
    applyWhen: () => window.location.pathname === '/settings',

    waitReady: () => elementCollection.ready('form'),

    onLoad() {
      uploadCachedAvatar()
    },
  }
}
