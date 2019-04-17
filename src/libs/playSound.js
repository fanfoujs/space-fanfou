export default audioUrl => {
  const audio = new Audio()

  audio.src = audioUrl
  audio.play()
}
