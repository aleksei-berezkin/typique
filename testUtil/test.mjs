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

const reset = '\x1b[0m'

const fmtFn = escape => {
  const fn = str => `${escape}${str}${reset}`
  fn.toString = () => escape
  return fn
}

const bold = fmtFn('\x1b[1m')
const grey = fmtFn('\x1b[38;5;242m')
const red = fmtFn('\x1b[31m')
const green = fmtFn('\x1b[32m')
const blue = fmtFn('\x1b[34m')

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
  if (suiteInfo !== null)
    return testImpl(suiteInfo, name, cb)
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
    return (Array.isArray(data) && data.every(d => typeof d === 'string'))
      ? data
      : util.inspect(data, {depth: 10}).split('\n')
  }

  const diff = util.diff(stringify(actual), stringify(expected))

  console.log(`${bold}${red}---${reset} ${bold}${suiteName} / ${testName} -- actual${reset}`)
  console.log(`${bold}${green}+++${reset} ${bold}${suiteName} / ${testName} -- expected${reset}`)

  for (const [operation, line] of diff) {
    if (operation === 0)
      console.log(`  ${line}`)
    else if (operation === -1)
      console.log(red(`- ${line}`))
    else if (operation === 1)
      console.log(green(`+ ${line}`))
    else
      throw new Error(`Unknown diff operation: ${operation} in ${suiteName} / ${testName}, line: ${line}`)
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
