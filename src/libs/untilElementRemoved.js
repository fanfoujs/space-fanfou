import keepRetry from '@libs/keepRetry'
import isElementInDocument from '@libs/isElementInDocument'

const TIMEOUT_MS = 5 * 1000

export default element => {
  const start = Date.now()

  return keepRetry({
    checker: () => !isElementInDocument(element),
    until: () => Date.now() - start > TIMEOUT_MS,
  })
}
