import { h, render } from 'preact'
import settings from '@settings/settings'
import App from '@settings/components/App'

function renderApp() {
  render(<App />, document.getElementById('app'))
}

async function main() {
  await settings.ready()
  renderApp()
}
main()
