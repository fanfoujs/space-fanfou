import { h, Component } from 'preact'
import { browser } from 'wxt/browser'
import messaging from '../messaging'
import {
  FANFOU_OAUTH_AUTHORIZE,
  FANFOU_OAUTH_GET_STATUS,
  FANFOU_OAUTH_CLEAR_TOKENS,
} from '@constants'

export default class OAuthPanel extends Component {
  state = { loading: true, working: false, status: null, error: null, verifier: '', needsReload: false }
  checkVersion = 0

  componentDidMount() {
    this.mounted = true
    this.refreshStatus()
    window.addEventListener('focus', this.handleFocus)
  }

  componentWillUnmount() {
    this.mounted = false
    window.removeEventListener('focus', this.handleFocus)
  }

  handleFocus = () => {
    if (!this.state.working) this.refreshStatus()
  }

  async refreshStatus() {
    const checkVersion = ++this.checkVersion
    this.setState({ loading: true, error: null })
    try {
      const response = await messaging.postMessage({
        action: FANFOU_OAUTH_GET_STATUS,
        payload: { refreshAccount: true },
      })
      if (response?.error) throw new Error(response.error)
      if (this.mounted && checkVersion === this.checkVersion) {
        if (typeof response?.status?.loggedIn !== 'boolean') {
          this.setState({ status: null, needsReload: true, loading: false })
        } else {
          this.setState({ status: response.status, needsReload: false, loading: false })
        }
      }
    } catch (error) {
      console.error('[SpaceFanfou] 检查登录状态失败:', error)
      if (this.mounted && checkVersion === this.checkVersion) this.setState({ loading: false, error: '暂时无法检查登录状态，请稍后重试。' })
    }
  }

  handleAuthorize = async (options = {}) => {
    this.checkVersion++
    this.setState({ working: true, error: null })
    try {
      const response = await messaging.postMessage({
        action: FANFOU_OAUTH_AUTHORIZE,
        payload: { manual: !!options.manual, complete: !!options.complete, verifier: this.state.verifier },
      })
      if (response?.error) throw new Error(response.error)
      if (this.mounted) this.setState({
        status: response?.status || null,
        working: false,
        verifier: '',
        error: response?.status?.loggedIn || response?.status?.pendingAuthorization ? null : '登录未完成，请重试。',
      })
    } catch (error) {
      console.error('[SpaceFanfou] 登录失败:', error)
      if (this.mounted) this.setState({ working: false, error: '登录失败，请重试。' })
    }
  }

  handleClear = async () => {
    this.checkVersion++
    this.setState({ working: true, error: null })
    try {
      const response = await messaging.postMessage({ action: FANFOU_OAUTH_CLEAR_TOKENS })
      if (response?.error) throw new Error(response.error)
      if (this.mounted) this.setState({ status: response?.status || null, working: false })
    } catch (error) {
      console.error('[SpaceFanfou] 退出登录失败:', error)
      if (this.mounted) this.setState({ working: false, error: '退出失败，请重试。' })
    }
  }

  render() {
    const { loading, working, status, error, verifier, needsReload } = this.state
    const busy = loading || working
    const loggedIn = !!status?.loggedIn
    const pending = !!status?.pendingAuthorization
    return (
      <div className="sf-oauth-panel">
        <p role="status">{ loading ? '正在检查登录状态…' : needsReload ? '扩展已更新，请重新加载。' : working ? '正在处理…' : loggedIn ? '已登录' : '未登录' }</p>
        <div className="sf-oauth-panel__actions">
          { needsReload ? (
            <button type="button" onClick={() => browser.runtime.reload()}>重新加载扩展</button>
          ) : loggedIn ? (
            <button type="button" disabled={busy} onClick={this.handleClear}>退出登录</button>
          ) : pending ? (
            <button type="button" disabled={busy} onClick={() => this.handleAuthorize({ complete: true })}>完成登录</button>
          ) : (
            <button type="button" disabled={busy} onClick={() => this.handleAuthorize()}>OAuth 登录</button>
          ) }
        </div>
        { pending && !loggedIn && (
          <div>
            <p>在饭否确认后，返回这里完成登录。</p>
            <details><summary>饭否显示了验证码？</summary>
              <input aria-label="登录验证码" value={verifier} onInput={event => this.setState({ verifier: event.currentTarget.value })} />
            </details>
          </div>
        ) }
        { error && <p role="alert" className="sf-oauth-panel__error">{ error }</p> }
        { error && !status?.manualAuthorization && !pending && !loggedIn && (
          <button type="button" disabled={busy} onClick={() => this.handleAuthorize({ manual: true })}>改用手动登录</button>
        ) }
      </div>
    )
  }
}
