import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import child_process from 'node:child_process'
import { runInDir, suite, test } from '../testUtil/test.mjs'

const binDir = path.join(import.meta.dirname, '..', 'bin')

await runInDir(
  binDir,
  fileBasename => fileBasename.endsWith('.test.mjs')
)

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

  suiteHandle.test('css', () => {
    const css = String(fs.readFileSync(cssOutputFile))
    assert.equal(
      css,
      '.a {\n  color: red;\n}\n.b {\n  color: blue;\n}\n',
    )
  })
})
