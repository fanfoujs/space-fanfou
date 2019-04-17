import isNumber from 'is-number'

const ERR_FN_HAS_PRESET = new Error('fn 已经预先设置，不允许覆盖')
const ERR_WAIT_HAS_PRESET = new Error('wait 已经预先设置，不允许覆盖')

export default class Timeout {
  constructor({ fn, wait }) {
    if (this._hasPresetFn = typeof fn === 'function') {
      this._fn = fn
    }

    if (this._hasPresetWait = isNumber(wait)) {
      this._wait = wait
    }

    this._timeout = null
    this._wrappedFn = () => {
      this._timeout = null
      this._fn()
    }
  }

  setFn(fn) {
    if (this._hasPresetFn) {
      throw ERR_FN_HAS_PRESET
    }

    this._fn = fn
  }

  setWait(wait) {
    if (this._hasPresetWait) {
      throw ERR_WAIT_HAS_PRESET
    }

    this._wait = wait
  }

  isActive() {
    return this._timeout != null
  }

  setup() {
    if (this.isActive()) return

    this._timeout = setTimeout(this._wrappedFn, this._wait)
  }

  cancel() {
    if (!this.isActive()) return

    clearTimeout(this._timeout)
    this._timeout = null
  }
}
