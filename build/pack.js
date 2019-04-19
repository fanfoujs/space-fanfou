const path = require('path')
const cp = require('child_process')
const chalk = require('chalk')
const manifest = require('../static/manifest')

function zip() {
  const version = manifest.version_name || manifest.version
  const zipName = `space-fanfou-${version}.zip`
  const outPath = path.join(__dirname, '..', zipName)
  const distPath = path.join(__dirname, '..', 'dist')
  const command = `rm -f ${outPath} && cd ${distPath} && zip -r ${outPath} ./*`

  cp.execSync(command)
  // eslint-disable-next-line no-console
  console.log(`创建成功：${chalk.green(zipName)}`)
}
zip()
