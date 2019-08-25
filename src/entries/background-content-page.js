import features from '@features'
import safelyInvokeFn from '@libs/safelyInvokeFn'

async function init({ createEnvironment, modules, createFeatureClass, createSubfeatureClass }) {
  const environment = await createEnvironment()
  const Feature = createFeatureClass({ ...environment, modules })
  const Subfeature = createSubfeatureClass({ ...environment, modules })

  for (const [ featureName, { metadata, subfeatures } ] of Object.entries(features)) {
    if (!subfeatures) continue

    const feature = new Feature({
      featureName,
      metadata,
    })

    for (const [ subfeatureName, { style, script } ] of Object.entries(subfeatures)) {
      const subfeature = new Subfeature({
        featureName,
        subfeatureName,
        /// #if ENV_CONTENT || ENV_PAGE
        style,
        /// #endif
        script,
        parent: feature,
      })

      feature.addSubfeature(subfeature)
    }

    safelyInvokeFn(::feature.init)
  }
}

/// #if ENV_BACKGROUND
init(require('@background'))
/// #elif ENV_CONTENT
init(require('@content'))
/// #elif ENV_PAGE
init(require('@page'))
/// #endif
