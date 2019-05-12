function initSessionStorage() {
  const memoryStorage = {}

  return {
    read(key) {
      // eslint-disable-next-line no-prototype-builtins
      const isExists = memoryStorage.hasOwnProperty(key)
      const value = isExists ? memoryStorage[key] : null

      return value
    },

    readAll() {
      return { ...memoryStorage }
    },

    write(key, value) {
      memoryStorage[key] = value
    },

    delete(key) {
      delete memoryStorage[key]
    },
  }
}

export default initSessionStorage()
