import child_process from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

export async function suite(name, suiteCb) {
  const suiteFilter = process.argv[2] ?? ''

  if (name.includes(suiteFilter)) {
    const suiteInfo = {
      name,
      passed: 0,
      failed: 0,
    }
    notifyStartSuite(name)
    try {
      const testsPromises = []
      await suiteCb({
        test: async (name, cb) => {
          const testPromise = doTest(suiteInfo, name, cb)
          testsPromises.push(testPromise)
          return testPromise
        }
      })
      await Promise.all(testsPromises)
    } finally {
      notifyDoneSuite(suiteInfo)
    }
  } else {
    notifySkippedSuite(name)
  }
}

function notifyStartSuite(name) {
  console.log(`🚀 Starting suite ${name}`)
}

function notifyDoneSuite({name, passed, failed}) {
  console.log(`${ failed ? '❌' : '✅' } Done suite ${name}: ${passed}/${passed + failed} passed`)
}

function notifySkippedSuite(name) {
  console.log(`💤 Skipped suite ${name}`)
}

const defaultSuites = new Map()

export async function test(name, cb) {
  const suiteName = getDefaultSuiteName()
  if (!defaultSuites.has(suiteName)) {
    notifyStartSuite(suiteName)
    defaultSuites.set(suiteName, {
      name: suiteName,
      passed: 0,
      failed: 0,
    })
  }
  await doTest(defaultSuites.get(suiteName), name, cb)
}

process.on('beforeExit', () => {
  for (const suiteInfo of defaultSuites.values()) {
    notifyDoneSuite(suiteInfo)
  }
  if (defaultSuites.values().some(({failed}) => failed))
    process.exit(1)
})

function getDefaultSuiteName() {
  const original = Error.prepareStackTrace
  Error.prepareStackTrace = (_, stack) => stack
  const err = new Error()
  const stack = err.stack
  Error.prepareStackTrace = original
  // stack[0] = getCallerFile, stack[1] = test(), stack[2] - actual file from which test() was invoked
  return path.basename(stack[2].getFileName())
}

async function doTest(suiteInfo, name, cb) {
  try {
    await cb()
    suiteInfo.passed++
  } catch (e) {
    console.log(`❌ ${name}`)
    console.log(e)
    if ('actual' in e && 'expected' in e) {
      const { actual, expected } = e
      printDiff(name, actual, expected)
    }
    suiteInfo.failed++
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
