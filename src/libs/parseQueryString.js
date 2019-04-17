export default queryString => {
  return Object.fromEntries(new URLSearchParams(queryString).entries())
}
