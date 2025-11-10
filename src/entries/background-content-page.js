import features from '@features'
import safelyInvokeFn from '@libs/safelyInvokeFn'

let shouldInitialize = true

/// #if ENV_CONTENT
if (window.__SF_CONTENT_ENTRY_INITIALIZED__) {
  console.warn('[SpaceFanfou] Content script already initialized, skip duplicate execution')
  shouldInitialize = false
} else {
  window.__SF_CONTENT_ENTRY_INITIALIZED__ = true
}
/// #elif ENV_PAGE
if (window.__SF_PAGE_ENTRY_INITIALIZED__) {
  console.warn('[SpaceFanfou] Page script already initialized, skip duplicate execution')
  shouldInitialize = false
} else {
  window.__SF_PAGE_ENTRY_INITIALIZED__ = true
}
/// #endif

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
if (shouldInitialize) {
  init(require('@background'))
}
/// #elif ENV_CONTENT
if (shouldInitialize) {
  init(require('@content'))
}
/// #elif ENV_PAGE
if (shouldInitialize) {
  init(require('@page'))
}
/// #endif
