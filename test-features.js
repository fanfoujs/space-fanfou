/* eslint-disable no-console */
const fs = require('fs')

const getTabDefsStr = fs.readFileSync('src/settings/getTabDefs.js', 'utf8')
const match = getTabDefsStr.match(/const tabDefs = \[([\s\S]*?)\]\n\nexport/)
if (match) {
  const content = match[1]
  const keys = Array.from(content.matchAll(/'([a-z0-9-]+)'/g)).map(m => m[1])
  console.log('Keys in getTabDefs:', keys)
  const dirs = fs.readdirSync('src/features/').filter(f => fs.statSync('src/features/' + f).isDirectory())
  console.log('Dirs in features:', dirs)
  const missing = keys.filter(k => !dirs.includes(k))
  console.log('Missing features:', missing)
}
