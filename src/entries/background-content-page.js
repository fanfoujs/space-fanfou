import features from '@features'

import createBackgroundEnvironment from '@background/environment'
import createBackgroundFeature from '@background/feature/Feature'
import createBackgroundSubfeature from '@background/feature/Subfeature'
import backgroundModules from '@background/modules'

import createContentEnvironment from '@content/environment'
import createContentFeature from '@content/feature/Feature'
import createContentSubfeature from '@content/feature/Subfeature'
import contentModules from '@content/modules'

import createPageEnvironment from '@page/environment'
import createPageFeature from '@page/feature/Feature'
import createPageSubfeature from '@page/feature/Subfeature'
import pageModules from '@page/modules'

import safelyInvokeFn from '@libs/safelyInvokeFn'
import detectEnv from '@libs/detectEnv'

import { ENV_BACKGROUND, ENV_CONTENT, ENV_PAGE } from '@constants'

async function load(createEnvironment, modules, createFeature, createSubfeature) {
  const environment = await createEnvironment()
  const Feature = createFeature({ ...environment, modules })
  const Subfeature = createSubfeature({ ...environment, modules })

  for (const [ featureName, { metadata, subfeatures } ] of Object.entries(features)) {
    const feature = new Feature({ featureName, metadata })

    for (const [ subfeatureName, { envType, script, style } ] of Object.entries(subfeatures)) {
      if (envType === detectEnv()) {
        const subfeature = new Subfeature({ featureName, subfeatureName, script, style, parent: feature })

        feature.addSubfeature(subfeature)
      }
    }

    safelyInvokeFn(::feature.init)
  }
}

function bootstrap() {
  switch (detectEnv()) {
  case ENV_BACKGROUND: return load(createBackgroundEnvironment, backgroundModules, createBackgroundFeature, createBackgroundSubfeature)
  case ENV_CONTENT: return load(createContentEnvironment, contentModules, createContentFeature, createContentSubfeature)
  case ENV_PAGE: return load(createPageEnvironment, pageModules, createPageFeature, createPageSubfeature)
  default:
  }
}
bootstrap()
