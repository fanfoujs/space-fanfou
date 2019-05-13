import features from '@features'
import safelyInvokeFn from '@libs/safelyInvokeFn'
import detectEnv from '@libs/detectEnv'
import { ENV_BACKGROUND, ENV_CONTENT, ENV_PAGE } from '@constants'

async function init({ createEnvironment, modules, createFeature, createSubfeature }) {
  const environment = await createEnvironment()
  const Feature = createFeature({ ...environment, modules })
  const Subfeature = createSubfeature({ ...environment, modules })

  for (const [ featureName, { metadata, subfeatures } ] of Object.entries(features)) {
    const feature = new Feature({
      featureName,
      metadata,
    })

    for (const [ subfeatureName, { envType, loadScript, loadStyle } ] of Object.entries(subfeatures)) {
      if (envType === detectEnv()) {
        const subfeature = new Subfeature({
          featureName,
          subfeatureName,
          script: loadScript ? loadScript() : null,
          style: loadStyle ? loadStyle() : null,
          parent: feature,
        })

        feature.addSubfeature(subfeature)
      }
    }

    safelyInvokeFn(::feature.init)
  }
}

function bootstrap() {
  switch (detectEnv()) {
  case ENV_BACKGROUND: return init(require('@background'))
  case ENV_CONTENT: return init(require('@content'))
  case ENV_PAGE: return init(require('@page'))
  default:
  }
}
bootstrap()
