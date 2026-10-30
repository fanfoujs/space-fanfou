import { isLooseKebabCase } from '@libs/stringCases'
import log from '@libs/log'

const STORAGE_KEY = 'migrated'
let tail = Promise.resolve()
const queue = {
  add(task) {
    const result = tail.then(task)
    tail = result.catch(() => {})
    return result
  },
}

// 格式应为 "foo-bar/hello-world"
function verifyMigrationIdFormat(migrationId) {
  const splitString = migrationId.split('/')
  const [ namespace, member ] = splitString
  const isValid = (
    splitString.length === 2 &&
    isLooseKebabCase(namespace) &&
    (member ? isLooseKebabCase(member) : true)
  )

  if (!isValid) {
    throw new Error(`migrationId 格式违法：${migrationId}`)
  }
}

export default opts => queue.add(async () => {
  const { storage, storageAreaName, migrationId, executor } = opts
  const migrated = await storage.read(STORAGE_KEY, storageAreaName) || []

  if (typeof storageAreaName !== 'string') {
    throw new TypeError('必须指定 storageAreaName')
  }

  if (typeof migrationId !== 'string') {
    throw new TypeError('必须指定 migrationId')
  }

  if (typeof executor !== 'function') {
    throw new TypeError('必须指定 executor')
  }

  if (process.env.NODE_ENV === 'development') {
    verifyMigrationIdFormat(migrationId)
  }

  if (!migrated.includes(migrationId)) {
    try {
      await executor()
    } catch (error) {
      log.error(error)
      throw error
    }

    await storage.write(STORAGE_KEY, [ ...migrated, migrationId ], storageAreaName)
  }
})
