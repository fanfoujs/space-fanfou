/* eslint no-console: 0 */

const path = require('path')
const cp = require('child_process')
const chalk = require('chalk')
const timestamp = require('tinydate')('{YYYY}/{MM}/{DD} {HH}:{mm}:{ss}')
const manifest = require('../static/manifest')

function log(message) {
  console.log(`[${chalk.cyan(timestamp())}] ${message}`)
}

function pack() {
  const version = manifest.version_name || manifest.version
  const zipName = `space-fanfou-${version}.zip`
  const pkgRootPath = path.join(__dirname, '..')
  const outPath = path.join(pkgRootPath, zipName)
  const distPath = path.join(pkgRootPath, 'dist')
  const command = `rm -f ${JSON.stringify(outPath)} && cd ${JSON.stringify(distPath)} && zip -r ${JSON.stringify(outPath)} *`

  log(`正在创建：${chalk.green(zipName)}`)

  cp.exec(command, error => {
    if (error) {
      log(chalk.red('创建失败'))
      console.log(error)
    } else {
      log(chalk.green('创建成功'))
    }
  })
}
pack()
