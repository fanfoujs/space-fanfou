import safelyInvokeFn from '@libs/safelyInvokeFn'

export default async function initialize(features, environmentModules) {
  const { createEnvironment, modules, createFeatureClass, createSubfeatureClass } = environmentModules
  const environment = await createEnvironment()
  const Feature = createFeatureClass({ ...environment, modules })
  const Subfeature = createSubfeatureClass({ ...environment, modules })
  await Promise.all(Object.entries(features).map(async ([featureName, { metadata, subfeatures }]) => {
    const feature = new Feature({ featureName, metadata })
    for (const [subfeatureName, { style, script }] of Object.entries(subfeatures || {})) {
      feature.addSubfeature(new Subfeature({ featureName, subfeatureName, style, script, parent: feature }))
    }
    await safelyInvokeFn(feature.init.bind(feature))
  }))
}
