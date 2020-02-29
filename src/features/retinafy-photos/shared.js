import select from 'select-dom'

// eslint-disable-next-line import/prefer-default-export
export function processStatus(li) {
  const photoLink = select('a.photo.zoom', li)
  const photo = photoLink && select('img', photoLink)

  if (photoLink && photo) {
    photoLink.href = photoLink.href.replace(/@596w_1l\.jpg$/, '')
    photo.src = photo.src.replace(/@100w_100h_1l\.jpg$/, '@200w_200h_1l.jpg')
    photo.style.maxHeight = '100px'
  }
}
