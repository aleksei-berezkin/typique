import { runInDir } from '../../../testUtil/test.mjs'

runInDir(
  __dirname,
  fileBasename => fileBasename.endsWith('.test.js') && fileBasename !== 'pluginUnit.test.js'
)
