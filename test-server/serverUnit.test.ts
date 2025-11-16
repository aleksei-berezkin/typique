import { runInDir } from '../testUtil/test.mjs'

runInDir(
  import.meta.dirname,
  fileBasename => fileBasename.endsWith('.test.ts')
    && fileBasename !== 'server.test.ts'
    && fileBasename !== 'serverUnit.test.ts'
)
