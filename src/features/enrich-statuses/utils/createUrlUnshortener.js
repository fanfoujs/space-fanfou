import memoize from '@libs/memoize'

const STORAGE_AREA_NAME = 'session'

export default ({ storage, proxiedFetch }) => {
  async function unshortenUrl(shortUrl) {
    const cachedLongUrl = await readCache(shortUrl)

    if (cachedLongUrl) {
      return cachedLongUrl
    }

    const { error, responseJSON } = await proxiedFetch.get({
      url: `https://setq.me/url_expand.json`,
      query: { url_short: shortUrl }, // eslint-disable-line camelcase
      responseType: 'json',
    })
    const { url_long: longUrl } = responseJSON || {}

    if (error || !longUrl) {
      // 下次将会重试
      memoized.delete(shortUrl)
      throw new Error(`展开短链接 ${shortUrl} 失败`)
    }

    await writeCache(shortUrl, longUrl)

    return longUrl
  }

  function createStorageKey(shortUrl) {
    return `unshorten-url/${shortUrl}`
  }

  function readCache(shortUrl) {
    return storage.read(createStorageKey(shortUrl), STORAGE_AREA_NAME)
  }

  function writeCache(shortUrl, longUrl) {
    return storage.write(createStorageKey(shortUrl), longUrl, STORAGE_AREA_NAME)
  }

  const memoized = memoize(unshortenUrl)

  // 如果有连续多个对同一短网址的请求，只需展开一次
  return memoized
}
