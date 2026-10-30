import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const binary =
  process.env.FIREFOX_BINARY ||
  (process.platform === 'darwin'
    ? '/Applications/Firefox.app/Contents/MacOS/firefox'
    : 'firefox')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'space-fanfou-firefox-'))
const profile = path.join(temp, 'profile')
fs.mkdirSync(profile)
const fixture =
  '<!doctype html><html><head><meta charset="utf-8"><title>饭否测试</title></head><body><div id="container"><div id="header"></div><div id="navigation"><ul><li><a href="/tester">我的空间</a></li></ul></div><div id="content"><div id="phupdate"><form><textarea name="content"></textarea><div class="act"><div class="actpost"><span class="loading"></span><input class="formbutton" type="submit" value="发送"></div></div></form></div><div id="stream"><ol></ol></div></div><div id="sidebar"><div id="savedsearchs"><ul></ul></div></div></div></body></html>'
const proxy = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  response.end(fixture)
})
await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve))
const proxyPort = proxy.address().port
const reserve = net.createServer()
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve))
const port = reserve.address().port
await new Promise((resolve) => reserve.close(resolve))
const prefs = {
  'marionette.port': port,
  'marionette.enabled': true,
  'marionette.log.level': 'Trace',
  'browser.shell.checkDefaultBrowser': false,
  'browser.startup.homepage_override.mstone': 'ignore',
  'browser.startup.page': 0,
  'datareporting.policy.dataSubmissionEnabled': false,
  'toolkit.telemetry.reportingpolicy.firstRun': false,
  'network.proxy.type': 1,
  'network.proxy.http': '127.0.0.1',
  'network.proxy.http_port': proxyPort,
  'network.proxy.no_proxies_on': 'localhost,127.0.0.1',
  'dom.security.https_only_mode': false,
  'dom.security.https_first': false,
}
fs.writeFileSync(
  path.join(profile, 'user.js'),
  Object.entries(prefs)
    .map(
      ([key, value]) =>
        `user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`,
    )
    .join('\n'),
)
const child = spawn(
  binary,
  [
    '--headless',
    '--no-remote',
    '--profile',
    profile,
    '--marionette',
    '--remote-allow-system-access',
  ],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
  },
)
let browserLog = ''
child.on('exit', (code, signal) => {
  browserLog += `\nFirefox exit: ${code} ${signal}\n`
})
child.stdout.on('data', (data) => {
  browserLog += data
})
child.stderr.on('data', (data) => {
  browserLog += data
})
let socket
let counter = 0
const pending = new Map()
let buffer = Buffer.alloc(0)
const command = (name, parameters = {}) =>
  new Promise((resolve, reject) => {
    const id = ++counter
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`Firefox command timed out: ${name}`))
    }, 20_000)
    pending.set(id, { resolve, reject, timer })
    const message = JSON.stringify([0, id, name, parameters])
    socket.write(Buffer.byteLength(message) + ':' + message)
  })
async function evaluate(script) {
  const result = await command('WebDriver:ExecuteScript', {
    script,
    args: [],
    newSandbox: true,
    sandbox: 'default',
  })
  return result.value
}
async function until(check, label) {
  const end = Date.now() + 12_000
  while (Date.now() < end) {
    if (await check()) return
    await delay(100)
  }
  throw new Error(`Firefox check failed: ${label}`)
}
try {
  await until(async () => {
    try {
      socket = await new Promise((resolve, reject) => {
        const client = net.connect({ host: '127.0.0.1', port }, () =>
          resolve(client),
        )
        client.on('error', reject)
      })
      return true
    } catch {
      return false
    }
  }, 'Marionette startup')
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    while (true) {
      const colon = buffer.indexOf(':')
      if (colon < 0) break
      const length = Number(buffer.subarray(0, colon).toString())
      if (buffer.length < colon + 1 + length) break
      const message = JSON.parse(
        buffer.subarray(colon + 1, colon + 1 + length).toString(),
      )
      buffer = buffer.subarray(colon + 1 + length)
      if (!Array.isArray(message)) continue
      const [, id, error, result] = message
      const waiting = pending.get(id)
      if (!waiting) continue
      clearTimeout(waiting.timer)
      pending.delete(id)
      if (error)
        waiting.reject(new Error(error.message + '\n' + error.stacktrace))
      else waiting.resolve(result)
    }
  })
  const session = await command('WebDriver:NewSession', {
    capabilities: { alwaysMatch: { acceptInsecureCerts: true } },
  })
  const archive = path.join(temp, 'extension.xpi')
  execFileSync('zip', ['-qr', archive, '.'], {
    cwd: path.resolve('.output/firefox-mv3'),
  })
  const installed = await command('Addon:Install', {
    path: archive,
    temporary: true,
  })
  await command('Marionette:SetContext', { value: 'chrome' })
  const uuid = await evaluate(
    `return JSON.parse(Services.prefs.getStringPref('extensions.webextensions.uuids'))[${JSON.stringify(installed.value)}];`,
  )
  assert.ok(uuid, 'Firefox assigned an extension origin')
  await command('Marionette:SetContext', { value: 'content' })
  await command('WebDriver:Navigate', {
    url: `moz-extension://${uuid}/settings.html`,
  })
  await until(
    () => evaluate('return !!document.querySelector(".wrapper")'),
    'settings rendering',
  )
  assert.ok(
    await evaluate('return document.body.textContent.includes("太空饭否")'),
  )
  await command('WebDriver:Navigate', { url: 'http://fanfou.com/home' })
  await until(
    () =>
      evaluate('return !!window.wrappedJSObject.__SF_PAGE_ENTRY_INITIALIZED__'),
    'MAIN-world injection',
  )
  await until(
    () =>
      evaluate(
        `return !!document.querySelector('link[href*="page-style.css"]')?.sheet && document.querySelectorAll('style.sf-asset').length > 0`,
      ),
    'extension styles',
  )
  await until(
    async () =>
      evaluate(
        'const input=document.querySelector("#phupdate textarea"); input.value="Firefox迁移草稿"; input.dispatchEvent(new Event("input",{bubbles:true})); return localStorage.getItem("space-fanfou:status-form:draft")==="Firefox迁移草稿";',
      ),
    'cross-compartment messaging and draft saving',
  )
  await command('WebDriver:Refresh')
  await until(
    () =>
      evaluate(
        'return document.querySelector("#phupdate textarea")?.value === "Firefox迁移草稿"',
      ),
    'draft restoration',
  )
  const report = {
    browserVersion: session.capabilities.browserVersion,
    settings: true,
    mainWorldInjection: true,
    messaging: true,
    draftSaveAndRestore: true,
  }
  fs.mkdirSync('test-results', { recursive: true })
  fs.writeFileSync(
    'test-results/firefox-smoke.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(JSON.stringify(report, null, 2))
  await command('WebDriver:DeleteSession')
} catch (error) {
  console.error(browserLog.slice(-5000))
  throw error
} finally {
  socket?.destroy()
  child.kill('SIGTERM')
  proxy.closeAllConnections()
  await new Promise((resolve) => proxy.close(resolve))
  fs.rmSync(temp, { force: true, recursive: true })
}
