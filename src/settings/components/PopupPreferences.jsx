import { h, Component } from 'preact'
import { browser } from 'wxt/browser'
import { DEFAULT_POPUP_MODE_KEY, LAST_POPUP_MODE_KEY } from '@platform/composer'

export default class PopupPreferences extends Component {
  state = { mode: 'settings', loading: true, error: '' }

  async componentDidMount() {
    this.mounted = true
    browser.storage.onChanged.addListener(this.handleStorageChange)
    try {
      const area = browser.storage.sync || browser.storage.local
      const [values, legacy] = await Promise.all([
        browser.storage.local.get(LAST_POPUP_MODE_KEY),
        area.get(DEFAULT_POPUP_MODE_KEY),
      ])
      const mode = values[LAST_POPUP_MODE_KEY] ?? legacy[DEFAULT_POPUP_MODE_KEY]
      if (this.mounted) this.setState({ mode: mode === 'compose' ? 'compose' : 'settings', loading: false })
    } catch {
      if (this.mounted) this.setState({ loading: false, error: '无法读取弹窗设置，请重试。' })
    }
  }

  componentWillUnmount() {
    this.mounted = false
    browser.storage.onChanged.removeListener(this.handleStorageChange)
  }

  handleStorageChange = (changes, area) => {
    if (area === 'local' && changes[LAST_POPUP_MODE_KEY]) {
      this.setState({ mode: changes[LAST_POPUP_MODE_KEY].newValue === 'compose' ? 'compose' : 'settings' })
    }
  }

  handleChange = async event => {
    const mode = event.currentTarget.value
    const previous = this.state.mode
    this.setState({ mode, loading: true, error: '' })
    try {
      await browser.storage.local.set({ [LAST_POPUP_MODE_KEY]: mode })
      if (this.mounted) this.setState({ mode, loading: false })
    } catch {
      if (this.mounted) this.setState({ mode: previous, loading: false, error: '保存失败，请重试。' })
    }
  }

  render() {
    const { mode, loading, error } = this.state
    return (
      <fieldset className="sf-popup-preferences" disabled={loading}>
        <legend>下次点击扩展图标时打开</legend>
        { [['settings', '设置'], ['compose', '快捷发饭']].map(([value, label]) => (
          <label key={value}>
            <input type="radio" name="default-popup-mode" value={value} checked={mode === value} onChange={this.handleChange} />
            { label }
          </label>
        )) }
        <p className="sf-popup-preferences__note">切换快捷发饭和设置后，会自动记住最后使用的模式。</p>
        { error && <p role="alert">{ error }</p> }
      </fieldset>
    )
  }
}
