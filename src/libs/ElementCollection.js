import select from 'select-dom'
import elementReady from 'element-ready'

export default class ElementCollection {
  constructor() {
    this._collection = {}
  }

  add(elements) {
    for (const [ alias, elementOpts ] of Object.entries(elements)) {
      let selector, parent, getAll

      if (typeof elementOpts === 'string') {
        selector = elementOpts
        getAll = false
      } else {
        selector = elementOpts.selector // eslint-disable-line prefer-destructuring
        parent = elementOpts.parent // eslint-disable-line prefer-destructuring
        getAll = elementOpts.getAll // eslint-disable-line prefer-destructuring
      }

      if (typeof selector !== 'string') {
        throw new Error('selector 未指定')
      }

      this._collection[alias] = {
        selector,
        parent,
        getAll,
        element: null,
        promise: null,
      }
    }
  }

  has(alias) {
    return ({}).hasOwnProperty.call(this._collection, alias)
  }

  get(alias) {
    if (Array.isArray(alias)) {
      const ret = {}

      for (const item of alias) {
        ret[item] = this.get(item)
      }

      return ret
    }

    const entry = this._collection[alias]

    if (!entry.element || (entry.getAll && !entry.element.length)) {
      const fn = entry.getAll ? select.all : select
      const parent = entry.parent
        ? this.get(entry.parent)
        : document

      entry.element = fn(entry.selector, parent)
    }

    return entry.element
  }

  getAll() {
    const allAliases = Object.keys(this._collection)

    return this.get(allAliases)
  }

  getToken(alias) {
    return {
      isElementCollectionToken: true,
      collection: this,
      alias,
    }
  }

  ready(alias) {
    const entry = this._collection[alias]

    if (entry.parent) {
      throw new Error('不能设定 parent')
    }

    if (!entry.promise) {
      entry.promise = elementReady(entry.selector)
    }

    return entry.promise
  }

  free() {
    for (const entry of Object.values(this._collection)) {
      entry.element = entry.promise = null
    }
  }
}
