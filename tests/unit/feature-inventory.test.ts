import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import inventory from '../../docs/feature-inventory.json'
import { createRegistry } from '../../src/features/registry'

const metadata = import.meta.glob('../../src/features/*/metadata.js', {
  eager: true,
})

test('every original user feature and option definition is retained', () => {
  const active = Object.keys(inventory.features)
    .filter((name) => !(name in inventory.retired))
    .sort()
  const actual = readdirSync('src/features', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  expect(actual).toEqual(active)
  for (const name of active) {
    const original = inventory.features[name as keyof typeof inventory.features]
    const metadataPath = path.join('src/features', name, 'metadata.js')
    expect(
      createHash('sha256').update(readFileSync(metadataPath)).digest('hex'),
      name,
    ).toBe(
      'approvedMetadataSha256' in original
        ? original.approvedMetadataSha256
        : original.metadataSha256,
    )
    const components = readdirSync(path.dirname(metadataPath))
      .filter((file) =>
        /@(background|content|page)\.(jsx?|less|css)$/.test(file),
      )
      .map((file) => file.replace(/\.jsx$/, '.js'))
      .sort()
    expect(components, name).toEqual([...original.components].sort())
  }
})

test('metadata registry retains falsy defaults and the storage location of each option', () => {
  const registry = createRegistry({
    './example/metadata.js': {
      options: {
        _: { defaultValue: true },
        zero: { defaultValue: 0 },
        empty: { defaultValue: '' },
        disabled: { defaultValue: false, disableCloudSyncing: true },
      },
    },
  })
  expect(registry.example!.metadata.defaultValues).toEqual({
    example: true,
    'example/zero': 0,
    'example/empty': '',
    'example/disabled': false,
  })
  expect(
    registry.example!.metadata.optionStorageAreaMap['example/disabled'],
  ).toBe('local')
  expect(Object.keys(metadata)).toHaveLength(
    Object.keys(inventory.features).length - 1,
  )
})
