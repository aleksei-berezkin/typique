import child_process from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import util from 'node:util'

export async function suite(name, suiteCb) {
  if (!matchesSuiteFilter(name)) {
    notifySkippedSuite(name)
    return
  }

  const suiteInfo = {
    name,
    passed: 0,
    failed: 0,
    skipped: 0,
  }

  notifyStartingSuite(name)
  try {
    const testsPromises = []
    await suiteCb({
      test: (name, cb) => {
        const testPromise = testImpl(suiteInfo, name, cb)
        testsPromises.push(testPromise)
        return testPromise
      }
    })
    await Promise.all(testsPromises)
  } finally {
    notifyDoneSuite(suiteInfo)
  }
}

function matchesSuiteFilter(name) {
  return name.includes(process.argv[2] ?? '')
}

function notifySkippedSuite(name) {
  console.log(`${grey('Skipping')} 💤 ${bold(name)}`)
}

function notifyStartingSuite(name) {
  console.log(`${grey('Starting')} 🚀 ${bold(name)}`)
}

function notifyDoneSuite({name, passed, failed, skipped}) {
  const emoji = failed ? '❌'
    : (skipped && !passed) ? '💤'
    : '✅'
  const passedStr = `${green(passed)} passed`
  const failedStr = failed ? `, ${red(failed)} failed` : ''
  const skippedStr = skipped ? `, ${blue(skipped)} skipped` : ''

  console.log(`${grey('Finished')} ${emoji} ${bold(name)}${grey(':')} ${passedStr}${failedStr}${skippedStr}`)
}

function bold(str) {
  return `\x1b[1m${str}\x1b[0m`
}

function grey(str) {
  return `\x1b[38;5;242m${str}\x1b[0m`
}

function red(str) {
  return `\x1b[31m${str}\x1b[0m`
}

function green(str) {
  return `\x1b[32m${str}\x1b[0m`
}

function blue(str) {
  return `\x1b[34m${str}\x1b[0m`
}

const defaultSuites = new Map()

export async function test(name, cb) {
  const suiteName = getDefaultSuiteName()
  if (!defaultSuites.has(suiteName)) {
    if (matchesSuiteFilter(suiteName)) {
      notifyStartingSuite(suiteName)
      defaultSuites.set(suiteName, {
        name: suiteName,
        passed: 0,
        failed: 0,
        skipped: 0,
      })
    } else {
      notifySkippedSuite(suiteName)
      defaultSuites.set(suiteName, null)
    }
  }

  const suiteInfo = defaultSuites.get(suiteName)
  if (suiteInfo !== null) {
    await testImpl(suiteInfo, name, cb)
  }
}

function getDefaultSuiteName() {
  const original = Error.prepareStackTrace
  Error.prepareStackTrace = (_, stack) => stack
  const err = new Error()
  const stack = err.stack
  Error.prepareStackTrace = original
  // stack[0] = getDefaultSuiteName(), stack[1] = test(), stack[2] - actual file from which test() was invoked
  return path.basename(stack[2].getFileName())
}

let wereFailures = false

async function testImpl(suiteInfo, testName, cb) {
  if (!matchesTestFilter(testName)) {
    suiteInfo.skipped++
    return
  }

  const {name: suiteName} = suiteInfo
  try {
    await cb()
    suiteInfo.passed++
  } catch (e) {
    wereFailures = true
    console.log(`❌ ${suiteName} / ${testName}`)
    console.log(e)
    if ('actual' in e && 'expected' in e) {
      const { actual, expected } = e
      printDiff(suiteName, testName, actual, expected)
    }
    suiteInfo.failed++
  }
}

function matchesTestFilter(name) {
  return name.includes(process.argv[3] ?? '')
}

function printDiff(suiteName, testName, actual, expected) {
  function stringify(data) {
    const str = util.inspect(data, {depth: 10})
    return str.endsWith('\n') ? str : `${str}\n`
  }

  const nameStr = `${suiteName}---${testName}`.replaceAll(/[^\w]/g, '-')

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
  for (const suiteInfo of defaultSuites.values()) {
    if (suiteInfo !== null)
      notifyDoneSuite(suiteInfo)
  }

  if (wereFailures)
    process.exit(1)
})
