import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const inventory = JSON.parse(
  fs.readFileSync('docs/feature-inventory.json', 'utf8'),
)
const features = Object.entries(inventory.features).filter(
  ([name]) => !(name in inventory.retired),
)
const beta = process.argv.includes('--beta')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (beta) {
  assert.ok(
    Number.isInteger(packageJson.chromeBetaBuild) &&
      packageJson.chromeBetaBuild >= 0 &&
      packageJson.chromeBetaBuild <= 65535,
    'chromeBetaBuild must be an integer between 0 and 65535',
  )
}
for (const browser of beta ? ['chrome'] : ['chrome', 'firefox', 'safari']) {
  const output = path.resolve(`.output/${browser}-mv3${beta ? '-beta' : ''}`)
  const manifest = JSON.parse(
    fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'),
  )
  assert.equal(manifest.manifest_version, 3)
  assert.equal(
    manifest.version,
    beta
      ? `${packageJson.version}.${packageJson.chromeBetaBuild}`
      : packageJson.version,
  )
  assert.equal(manifest.name, beta ? '太空饭否 Beta' : '太空饭否')
  if (beta) {
    assert.equal(manifest.version_name, packageJson.version)
    assert.equal(manifest.action.default_title, '太空饭否 Beta')
    assert.ok(
      manifest.description.includes('THIS EXTENSION IS FOR BETA TESTING'),
    )
  }
  assert.equal(
    browser === 'chrome'
      ? manifest.background.service_worker
      : manifest.background.scripts[0],
    'background.js',
  )
  assert.equal(manifest.permissions.includes('offscreen'), browser === 'chrome')
  assert.equal(manifest.permissions.includes('identity'), browser !== 'safari')
  assert.equal(
    manifest.permissions.includes('notifications'),
    browser !== 'safari',
  )
  const bundles = Object.fromEntries(
    ['background', 'content', 'page'].map((environment) => [
      environment,
      fs.readFileSync(
        path.join(
          output,
          environment === 'content'
            ? 'content-scripts/content.js'
            : `${environment}.js`,
        ),
        'utf8',
      ),
    ]),
  )
  for (const [name, feature] of features) {
    for (const source of Object.values(bundles))
      assert.ok(
        source.includes(`./${name}/metadata.js`),
        `${browser}: missing ${name} metadata`,
      )
    for (const component of feature.components) {
      const environment = component.match(/@(background|content|page)\./)[1]
      const files = fs.readdirSync(path.join('src/features', name))
      const actual = files.includes(component)
        ? component
        : component.replace(/\.js$/, '.jsx')
      assert.ok(
        bundles[environment].includes(`./${name}/${actual}`),
        `${browser}: missing ${name}/${actual}`,
      )
    }
  }
  for (const source of Object.values(bundles)) {
    assert.ok(
      !/\beval\s*\(|new Function\s*\(/.test(source),
      `${browser}: dynamic code execution`,
    )
    assert.ok(
      !source.includes('google-analytics.com'),
      `${browser}: legacy remote analytics`,
    )
  }
  for (const html of [
    'settings.html',
    ...(browser === 'chrome' ? ['offscreen.html'] : []),
  ]) {
    const source = fs.readFileSync(path.join(output, html), 'utf8')
    for (const [, resource] of source.matchAll(/(?:src|href)="(\/[^"#?]+)"/g))
      assert.ok(
        fs.existsSync(path.join(output, resource.slice(1))),
        `${browser}: missing HTML resource ${resource}`,
      )
  }
  assert.ok(fs.existsSync(path.join(output, 'assets/page-style.css')))
  console.log(
    `${browser}${beta ? ' beta' : ''}: MV3 manifest, ${features.length} feature registries, all scripts/styles and local resources verified`,
  )
}
