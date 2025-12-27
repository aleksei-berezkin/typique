import { runInDir } from '../testUtil/test.mjs'

runInDir(
  import.meta.dirname,
  fileBasename => fileBasename.endsWith('.test.ts')
    && fileBasename !== 'server.test.ts'
    && fileBasename !== 'server.new.test.ts'
    && fileBasename !== 'server.old.test.ts'
    && fileBasename !== 'serverUnit.test.ts'
)
