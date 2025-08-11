import childProcess from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

fs.readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js') && f !== path.basename(__filename))
  .forEach(runTest)

function runTest(fileBasename: string) {
  console.log(`Running ${fileBasename}...`)
  try {
    childProcess.execSync(`node ${path.join(__dirname, fileBasename)}`, {
      stdio: 'inherit',
    })
  } catch (e: any) {
    if (e.status === 1) {
      process.exit(1)
    } else {
      throw e
    }
  }
}
