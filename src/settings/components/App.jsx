import { browser } from 'wxt/browser'
import { h, Component } from 'preact'
import cx from 'classnames'
import getTabDefs from '../getTabDefs'
import messaging from '../messaging'
import settings from '../settings'
import CloudSyncingDisabledTip from './CloudSyncingDisabledTip'
import Composer from './Composer'
import { DEFAULT_POPUP_MODE_KEY, LAST_POPUP_MODE_KEY, LAST_SETTINGS_TAB_KEY } from '@platform/composer'
import { SETTINGS_WRITE, CONTROL_PLACEHOLDER } from '@constants'

const LAST_TAB_ID_STORAGE_KEY = 'settings/lastTabId'

let tabDefs

export default class App extends Component {
  constructor(...args) {
    super(...args)

    this.state = {
      isReady: false,
      currentTabId: 'page-features',
      optionValues: {},
      mode: 'settings',
    }

    this.init()
  }

  async init() {
    const params = new URLSearchParams(window.location.search)
    this.isPopup = this.props.isPopup
    const [definitions, optionValues, saved, legacy] = await Promise.all([
      getTabDefs(),
      settings.readAll(),
      browser.storage.local.get([LAST_POPUP_MODE_KEY, LAST_SETTINGS_TAB_KEY]),
      (browser.storage.sync || browser.storage.local).get([DEFAULT_POPUP_MODE_KEY, LAST_TAB_ID_STORAGE_KEY]),
    ])
    tabDefs = definitions
    // Migrate the old numeric setting once; subsequent navigation uses stable IDs
    // and local storage so another browser cannot change this window's last view.
    const oldTabId = legacy[LAST_TAB_ID_STORAGE_KEY]
    const lastTabId = saved[LAST_SETTINGS_TAB_KEY]
      ?? (Number.isInteger(oldTabId) ? tabDefs[oldTabId]?.id : undefined)
    const restoredTabId = tabDefs.some(tab => tab.id === lastTabId) ? lastTabId : 'page-features'
    const currentTabId = window.location.hash === '#version-history' ? 'version-history' : restoredTabId
    const lastMode = saved[LAST_POPUP_MODE_KEY] ?? legacy[DEFAULT_POPUP_MODE_KEY]
    const mode = window.location.hash === '#version-history' ? 'settings'
      : params.get('mode') === 'compose' || (this.isPopup && lastMode === 'compose') ? 'compose' : 'settings'

    this.setState({
      isReady: true,
      currentTabId,
      mode,
      optionValues,
    })
    if (saved[LAST_SETTINGS_TAB_KEY] == null) {
      browser.storage.local.set({ [LAST_SETTINGS_TAB_KEY]: restoredTabId }).catch(console.error)
    }
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.handleHashChange)
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.handleHashChange)
  }

  handleHashChange = () => {
    if (window.location.hash === '#version-history') {
      this.setState({ mode: 'settings', currentTabId: 'version-history' })
    }
  }

  componentDidUpdate() {
    document.title = `太空饭否 - ${this.state.mode === 'compose' ? '快捷发饭' : '设置'}`
    document.documentElement.classList.toggle('sf-popup--compose', this.isPopup && this.state.mode === 'compose')
  }

  showSettings = (login = false) => {
    this.showMode('settings')
    if (login) this.selectTab('tools')
  }

  showMode = mode => {
    this.setState({ mode })
    browser.storage.local.set({ [LAST_POPUP_MODE_KEY]: mode }).catch(console.error)
  }

  selectTab = currentTabId => {
    this.setState({ currentTabId }, () => {
      document.getElementById('tabs')?.scrollTo(0, 0)
      window.scrollTo(0, 0)
    })
    browser.storage.local.set({ [LAST_SETTINGS_TAB_KEY]: currentTabId }).catch(console.error)
  }

  saveSetting = async (key, value) => {
    await messaging.postMessage({
      action: SETTINGS_WRITE,
      payload: { key, value },
    })
  }

  render() {
    return this.state.isReady && (
      <div className={cx('sf-app', { 'sf-app--compose': this.state.mode === 'compose' })}>
        <Composer active={this.state.mode === 'compose'} onSettings={this.showSettings} />
        <div hidden={this.state.mode !== 'settings'}>
          <div className="wrapper">
            { this.renderNavagation() }
            { this.renderTabs() }
          </div>
        </div>
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
        <div className="sf-nav-actions">
          <button className="custom-appearance sf-quiet-button" type="button" onClick={() => this.showMode('compose')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="m16 3 5 5-12 12-6 1 1-6Z" />
              <path d="m14 5 5 5" />
            </svg>
            <span>快捷发饭</span>
          </button>
        </div>
      </nav>
    )
  }

  renderNavagationItem = tabDef => {
    const { currentTabId } = this.state
    const { id: tabId, title, startsGroup } = tabDef
    const classNames = cx({
      current: currentTabId === tabId,
      'sf-nav-group-start': startsGroup,
    })
    const onClick = () => this.selectTab(tabId)

    return (
      <li key={tabId} className={classNames}>
        <button className="custom-appearance" type="button" onClick={onClick} aria-current={currentTabId === tabId ? 'page' : undefined}>{ title }</button>
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

  renderTab = tabDef => {
    const { currentTabId } = this.state
    const { id: tabId, title, children, sections } = tabDef
    const classNames = cx('tab', { hide: tabId !== currentTabId })

    return (
      <div key={tabId} className={classNames}>
        <header><h2>{ title }</h2></header>
        { tabId === currentTabId && (children || sections.map(this.renderSection)) }
      </div>
    )
  }

  renderSection = (sectionDef, sectionId) => {
    const { title, options = [], children } = sectionDef

    return (
      <section key={sectionId}>
        <h3>{ title }</h3>
        { options.map(this.renderOptionGroup) }
        { children }
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
        { type === 'text' && this.renderTextInput(optionDef) }
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

  renderTextInput(optionDef) {
    const label = optionDef.label || ''
    const controlOptions = this.getControlOptions(optionDef, 'value')

    if (label.includes(CONTROL_PLACEHOLDER)) {
      const [ pre, post ] = label.split(CONTROL_PLACEHOLDER)

      return (
        <label className="text-input-inline">
          { pre }<input type="text" {...controlOptions} />{ post }
        </label>
      )
    }

    return (
      <label className="text-input">
        <span>{ label }</span>
        <input type="text" {...controlOptions} />
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
      const nextValue = event.target[valueKey]
      this.setState(state => ({
        optionValues: {
          ...state.optionValues,
          [key]: nextValue,
        },
      }))
      this.saveSetting(key, nextValue).catch(console.error)
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
