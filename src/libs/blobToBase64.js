/* eslint-disable unicorn/prefer-add-event-listener */

export default blob => new Promise((resolve, reject) => {
  const fr = new FileReader()

  fr.onload = () => resolve(fr.result)
  fr.onerror = () => reject(fr.error)
  fr.readAsDataURL(blob)
})
