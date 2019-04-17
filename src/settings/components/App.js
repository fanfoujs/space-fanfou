import { h, Component } from 'preact'
import cx from 'classnames'
import { SETTINGS_WRITE_ALL, CONTROL_PLACEHOLDER } from '@constants'
import getTabDefs from '../getTabDefs'
import messaging from '../messaging'
import settings from '../settings'
import CloudSyncingDisabledTip from './CloudSyncingDisabledTip'

const LAST_TAB_ID_STORAGE_KEY = 'settings/lastTabId'

let tabDefs

export default class App extends Component {
  constructor(...args) {
    super(...args)

    this.background = null

    this.state = {
      isReady: false,
      currentTabId: 0,
      optionValues: {},
    }

    this.init()
  }

  async init() {
    const currentTabId = window.location.hash === '#version-history'
      ? 3
      : await this.readLastTabId() || 0

    tabDefs = await getTabDefs()

    this.background = await this.initBackground()

    this.setState({
      isReady: true,
      currentTabId,
      optionValues: await settings.readAll(),
    })

    window.addEventListener('unload', this.writeLastTabId)
  }

  initBackground = () => new Promise(resolve => {
    chrome.runtime.getBackgroundPage(resolve)
  })

  saveSettings = async () => {
    const { optionValues } = this.state

    await messaging.postMessage({
      action: SETTINGS_WRITE_ALL,
      payload: { optionValues },
    })
  }

  readLastTabId = () => new Promise(resolve => {
    chrome.storage.sync.get(LAST_TAB_ID_STORAGE_KEY, values => {
      resolve(values[LAST_TAB_ID_STORAGE_KEY])
    })
  })

  writeLastTabId = () => {
    // 因为操作是异步的，页面关闭可能来不及完成写入操作就退出了
    // 放到后台去做这个操作
    this.background.chrome.storage.sync.set({
      [LAST_TAB_ID_STORAGE_KEY]: this.state.currentTabId,
    })
  }

  render() {
    return this.state.isReady && (
      <div className="wrapper">
        { this.renderNavagation() }
        { this.renderTabs() }
      </div>
    )
  }

  renderNavagation() {
    return (
      <nav>
        <h1>太空饭否</h1>
        <ul>
          { tabDefs.map(this.renderNavagationItem) }
        </ul>
      </nav>
    )
  }

  renderNavagationItem = (tabDef, tabId) => {
    const { currentTabId } = this.state
    const { title } = tabDef
    const classNames = cx({ current: currentTabId === tabId })
    const onClick = () => this.setState({ currentTabId: tabId })

    return (
      <li key={tabId} className={classNames}>
        <a onClick={onClick}>{ title }</a>
      </li>
    )
  }

  renderTabs() {
    return (
      <div id="tabs">
        { tabDefs.map(this.renderTab) }
      </div>
    )
  }

  renderTab = (tabDef, tabId) => {
    const { currentTabId } = this.state
    const { title, children, sections } = tabDef
    const classNames = cx('tab', { hide: tabId !== currentTabId })

    return (
      <div key={tabId} className={classNames}>
        <header><h2>{ title }</h2></header>
        { children || sections.map(this.renderSection) }
      </div>
    )
  }

  renderSection = (sectionDef, sectionId) => {
    const { title, options } = sectionDef

    return (
      <section key={sectionId}>
        <h3>{ title }</h3>
        { options.map(this.renderOptionGroup) }
      </section>
    )
  }

  renderOptionGroup = (optionDefs, optionGroupId) => {
    return (
      <ul key={optionGroupId}>
        { optionDefs.map(this.renderOption) }
      </ul>
    )
  }

  renderOption = optionDef => {
    const { key, isSubOption, parentKey, type } = optionDef
    const classNames = cx('option', {
      'is-sub-option': isSubOption,
      'hide': isSubOption && !this.getOptionValue(parentKey),
    })

    return (
      <li key={key} className={classNames}>
        { type === 'checkbox' && this.renderCheckbox(optionDef) }
        { type === 'number' && this.renderNumberInput(optionDef) }
        { this.renderComment(optionDef) }
        { optionDef.disableCloudSyncing && <CloudSyncingDisabledTip /> }
      </li>
    )
  }

  renderCheckbox(optionDef) {
    const { label } = optionDef
    const controlOptions = this.getControlOptions(optionDef, 'checked')
    const labelClassNames = cx({ 'is-disabled': optionDef.isSoldered })

    return (
      <span className="checkbox">
        <label className={labelClassNames}>
          <input type="checkbox" {...controlOptions} /><span />{ label }
        </label>
      </span>
    )
  }

  renderNumberInput(optionDef) {
    const [ pre, post ] = optionDef.label.split(CONTROL_PLACEHOLDER)
    const controlOptions = this.getControlOptions(optionDef, 'valueAsNumber')

    return (
      <label>
        { pre }<input type="number" {...controlOptions} />{ post }
      </label>
    )
  }

  renderComment(optionDef) {
    const { comment } = optionDef

    return comment && (
      <span className="comment">{ comment }</span>
    )
  }

  getControlOptions(optionDef, valueKey) {
    const { key } = optionDef
    const value = this.getOptionValue(key)
    const onChange = event => {
      this.setState(state => ({
        optionValues: {
          ...state.optionValues,
          [key]: event.target[valueKey],
        },
      }), this.saveSettings)
    }

    return {
      [valueKey]: value,
      disabled: optionDef.isSoldered,
      onChange,
      ...optionDef.controlOptions,
    }
  }

  getOptionValue(key) {
    return this.state.optionValues[key]
  }
}
