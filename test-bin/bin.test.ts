import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import child_process from 'node:child_process'
import { runInDir, suite, test } from '../testUtil/test.mjs'

const binDir = path.join(import.meta.dirname, '..', 'packages', 'typique', 'bin')

await runInDir(
  binDir,
  fileBasename => fileBasename.endsWith('.test.mjs')
)

suite('bin', async suiteHandle => {
  for (const useRelativeFile of [true, false]) {
    for (const tsVersion of ['old', 'new', 'cur']) {
      const suffix = useRelativeFile ? 'rel' : 'abs'

      await suiteHandle.test(`typique ${tsVersion} ${suffix}`, async () => {
        const testProjectDir = path.join(import.meta.dirname, `./bin-test-${suffix}`)
        const logFile = path.join(testProjectDir, `./tsserver-log.log`)
        const cssOutputFile = path.join(testProjectDir, './typique-output.css');

        [logFile, cssOutputFile].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file)
          }
        })

        const cwd = path.join(import.meta.dirname, '..')

        const projectFileAbs = path.join(testProjectDir, './a.ts')

        const projectFile = useRelativeFile
          ? path.relative(cwd, projectFileAbs)
          : projectFileAbs

        const tsserverExecutable = tsVersion === 'cur'
          ? undefined
          : path.join(import.meta.dirname, '..', `test-ts-${tsVersion}`, 'node_modules', 'typescript', 'lib', 'tsserver.js')

        const tsserverArg = tsserverExecutable
          ? `--tsserver ${tsserverExecutable}`
          : ''

        await new Promise((resolve, reject) => {
          child_process.exec(
            `npx typique --projectFile ${projectFile} ${tsserverArg} -- --logVerbosity verbose --logFile ${logFile}`,
            {cwd},
            (err, stdout, stderr) => {
              console.log('✔️ ', suffix, tsVersion)
              if (err) {
                if (stdout)console.error(String(stdout))
                if (stderr) console.error(String(stderr))
                reject(err)
              } else {
                resolve('ok')
              }
            }
          )
        })

        const css = String(fs.readFileSync(cssOutputFile))
        assert.equal(
          css,
          '.a {\n  color: red;\n}\n.b {\n  color: blue;\n}\n',
        )
      })
    }
  }
})
