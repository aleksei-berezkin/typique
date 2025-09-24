import child_process from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

let userSuiteName = undefined
let defaultSuiteName = undefined

export async function suite(name, cb) {
  if (userSuiteName) throw new Error('Nested suites are not supported')
  if (defaultSuiteName) throw new Error(`This app runs in a default suite named ${defaultSuiteName}`)

  const suiteFilter = process.argv[2] ?? ''

  if (name.includes(suiteFilter)) {
    try {
      userSuiteName = name
      notifyStartSuite()
      await cb()
    } finally {
      notifyEndSuite()
      userSuiteName = undefined
    }
  } else {
    console.log(`💤 Skipped suite ${name}`)
  }
}

let passed = 0
let failed = 0

const suiteName = () => userSuiteName ?? defaultSuiteName
function notifyStartSuite() {
  console.log(`🚀 Running suite ${suiteName()}`)
}

function notifyEndSuite() {
  console.log(`${ failed ? '❌' : '✅' } ${passed}/${passed + failed} passed`)
  passed = 0
  failed = 0
}

export async function test(name, cb) {
  if (suiteName() == null) {
    defaultSuiteName = path.basename(process.argv[1])
    notifyStartSuite()
  }

  try {
    await cb()
    passed++
  } catch (e) {
    console.log(`❌ ${name}`)
    console.log(e)
    if ('actual' in e && 'expected' in e) {
      const { actual, expected } = e
      printDiff(name, actual, expected)
    }
    failed++
  }
}

function printDiff(testName, actual, expected) {
  function stringify(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    return str.endsWith('\n') ? str : str + '\n'
  }

  const nameStr = `${suiteName()}---${testName}`.replaceAll(/[^\w]/g, '-')

  function writeTempFile(prefix, content) {
    const filePath = path.join(os.tmpdir(), `${prefix}${nameStr}.txt`)
    fs.writeFileSync(filePath, content, 'utf8')
    return filePath
  }

  const actualFile = writeTempFile('--actual---', stringify(actual))
  const expectedFile = writeTempFile('expected---', stringify(expected))

  try {
    /*
     * This shoould also work:
     * `diff --color -u --unified=2000 a.txt b.txt`
     * but for some reason `... | less -R` doesn't colorize
     */
    child_process.execSync(
      `git --no-pager diff --no-index --color=always --unified=2000 ${actualFile} ${expectedFile}`,
      { stdio: 'inherit' }
    )
  } catch (e) {
    const {status} = e
    if (status === 1) {
      // Expected
    } else {
      throw e
    }
  } finally {
    fs.unlinkSync(actualFile)
    fs.unlinkSync(expectedFile)
  }
}

process.on('beforeExit', () => {
  if (suiteName() != null) {
    notifyEndSuite()
  }
})
