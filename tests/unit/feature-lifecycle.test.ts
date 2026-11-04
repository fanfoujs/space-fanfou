import createFeatureClass from '../../src/background/feature/createFeatureClass'

test('a subfeature waiting for a website library does not block independent features or settings listeners', async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  const second = vi.fn()
  const listen = vi.fn()
  const Feature = createFeatureClass({
    bridge: undefined,
    settings: { readAll: async () => ({}) },
    messaging: { registerBroadcastListener: listen },
    modules: {},
  })
  const feature = new Feature({
    featureName: 'test',
    metadata: { isSoldered: true, optionNames: [] },
  })
  feature.addSubfeature({ load: () => pending, unload: vi.fn() })
  feature.addSubfeature({ load: second, unload: vi.fn() })
  const initialized = feature.init()
  await vi.waitFor(() => expect(second).toHaveBeenCalledTimes(1))
  expect(listen).toHaveBeenCalledTimes(1)
  finish()
  await initialized
})
