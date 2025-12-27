import { runInDir } from 'test-util'

runInDir(
  __dirname,
  fileBasename => fileBasename.endsWith('.test.js') && fileBasename !== 'pluginUnit.test.js'
)
