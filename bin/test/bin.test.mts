import fs from 'node:fs'
import path from 'node:path'
import child_process from 'node:child_process'
import { suite, test } from '../../testUtil/test.mjs'

const binDir = path.join(import.meta.dirname, '..')

for (const fileBasename of fs.readdirSync(binDir)) {
  if (fileBasename.endsWith('.test.mjs')) {
    await import(path.join(binDir, fileBasename))
  }
}

suite('bin', async suiteHandle => {
  const logFile = path.join(import.meta.dirname, './log-bin.log')
  const testProjectDir = path.join(import.meta.dirname, './bin-test-project')
  const cssOutputFile = path.join(testProjectDir, './typique-output.css');

  [logFile, cssOutputFile].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  })

  const cwd = path.join(binDir, '..')

  child_process.execSync(`npx typique --projectFile ${testProjectDir}/a.ts -- --logVerbosity verbose --logFile ${logFile}`, {cwd})

})
