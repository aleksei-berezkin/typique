import { splitName } from './names'

export type ClassNamePattern = ClassNamePatternElement[]
export type ClassNamePatternElement = string | VarNamePlaceholder | CounterPlaceholder | RandomPlaceholder
export type VarNamePlaceholder = {
  type: 'varName'
}
export type CounterPlaceholder = {
  type: 'counter'
}
export type RandomPlaceholder = {
  type: 'random'
  n: number
  possibleChars: string
}

export function parseClassNamePattern(input: string): ClassNamePattern {
  return [...parseClassNamePatternImpl(input)]
}

const alphabetLowercase = 'abcdefghijklmnopqrstuvwxyz'
const alphabetUppercase = alphabetLowercase.toUpperCase()
const alphabet = alphabetLowercase + alphabetUppercase
const numbers = '0123456789'

function* parseClassNamePatternImpl(input: string): IterableIterator<ClassNamePatternElement> {
  let curr = 0
  for (const m of input.matchAll(/\$\{(?<ty>varName|counter|random(?<rndTy>Alpha|Numeric)?\((?<n>\d+)\))\}/g)) {
    if (m.index > curr)
      yield input.slice(curr, m.index)

    const ty = m.groups!.ty
    if (ty === 'varName')
      yield {type: 'varName'}
    else if (ty === 'counter')
      yield {type: 'counter'}
    else if (ty.startsWith('random')) {
      const rndTy = m.groups!.rndTy
      const possibleChars = rndTy === 'Alpha' ? alphabet
        : rndTy === 'Numeric' ? numbers
        : alphabet + numbers
      const n = +m.groups!.n
      yield {type: 'random', n, possibleChars}
    }

    curr = m.index + m[0].length
  }
  if (curr < input.length)
    yield input.slice(curr)
}

function hasVarName(pattern: ClassNamePattern) {
  return pattern.some(it => typeof it === 'object' && it.type === 'varName')
}
function hasRandom(pattern: ClassNamePattern) {
  return pattern.some(it => typeof it === 'object' && it.type.startsWith('random'))
}
function hasExplicitCounter(pattern: ClassNamePattern) {
  return pattern.some(it => typeof it === 'object' && it.type === 'counter')
}

export type RenderCommonParams = {
  pattern: ClassNamePattern
  isUsed: (className: string) => boolean
  maxCounter: number
  maxRandomRetries: number
  randomGen: () => number
}

export function renderClassNamesForOneVar(
  varNameVariants: string[],
  commonParams: RenderCommonParams,
) {
  return hasVarName(commonParams.pattern)
    ? varNameVariants.map(nameVariant => renderMultipleClassNamesSameWay([nameVariant], commonParams)[0])
    : renderMultipleClassNamesSameWay([''], commonParams)
}

export function renderClassNamesForMultipleVars(
  varsNames: string[],
  commonParams: RenderCommonParams,
) {
  if (hasVarName(commonParams.pattern))
    return renderMultipleClassNamesSameWay(varsNames, commonParams)

  const classNames: string[] = []
  const createdClassesAwareParams = {
    ...commonParams,
    isUsed: cn => commonParams.isUsed(cn) || classNames.includes(cn)
  } satisfies RenderCommonParams

  for (const _ of varsNames) {
    classNames.push(renderMultipleClassNamesSameWay([''], createdClassesAwareParams)[0])
  }

  return classNames
}


function renderMultipleClassNamesSameWay(
  varsNames: string[],
  commonParams: RenderCommonParams,
): string[] {
  const {pattern, isUsed, maxCounter, maxRandomRetries, randomGen} = commonParams

  function renderWithCounter(counterValue: number) {
    const {length} = varsNames
    const classNames = Array.from({length}, _ => '')
    function appendToEachClassName(val: string | number | ((i: number) => string)) {
      for (let i = 0; i < length; i++)
        classNames[i] += typeof val === 'function' ? val(i) : val
    }

    for (const el of pattern) {
      if (typeof el === 'string')
        appendToEachClassName(el)
      else if (el.type === 'varName')
        appendToEachClassName(i => varsNames[i])
      else if (el.type === 'counter')
        appendToEachClassName(counterValue)
      else if (el.type === 'random')
        for (let i = 0; i < el.n; i++) {
          const randomChar = el.possibleChars[Math.floor(randomGen() * el.possibleChars.length)]
          appendToEachClassName(randomChar)
        }
      else
        throw new Error(`Unknown pattern element: ${JSON.stringify(el)}`)
    }

    return classNames
  }

  function noneIsUsed(classNames: string[]) {
    return classNames.every(cn => !isUsed(cn))
  }

  if (hasRandom(pattern)) {
    for (let i = 0; i < maxRandomRetries; i++) {
      const classNames = renderWithCounter(0)
      if (noneIsUsed(classNames)) return classNames
    }
    
    throw new Error('Too many random class names')
  }
  
  if (!hasExplicitCounter(pattern)) {
    const classNames = renderWithCounter(-1)
    if (noneIsUsed(classNames)) return classNames

    const newCommonParams = {
      pattern: insertCounter(pattern),
      isUsed,
      maxCounter,
      maxRandomRetries,
      randomGen,
    }

    return renderMultipleClassNamesSameWay(varsNames, newCommonParams)
  }

  for (let counter = 0; counter <= maxCounter; counter++) {
    const classNames = renderWithCounter(counter)
    if (noneIsUsed(classNames)) return classNames
  }

  throw new Error('Too many class names')
}

function insertCounter(pattern: ClassNamePattern): ClassNamePattern {
  const varNameIndex = pattern.findIndex(it => typeof it === 'object' && it.type === 'varName')
  const counterInsertionIndex = varNameIndex === -1 ? pattern.length : varNameIndex + 1
  return [
    ...pattern.slice(0, counterInsertionIndex),
    '-',
    {type: 'counter'},
    ...pattern.slice(counterInsertionIndex),
  ]
}

export function classNameMatchesPattern(className: string, contextName: string, pattern: ClassNamePattern) {
  if (classNameMatchesPatternImpl(className, contextName, pattern)) return true

  if (!hasRandom(pattern)
    && !hasExplicitCounter(pattern)
    && classNameMatchesPatternImpl(className, contextName, insertCounter(pattern))
  )
    return true

  return false
}

function classNameMatchesPatternImpl(className: string, contextName: string, pattern: ClassNamePattern) {
  const varNameIndex = pattern.findIndex(it => typeof it === 'object' && it.type === 'varName')
  const leftPattern = varNameIndex === -1 ? pattern : pattern.slice(0, varNameIndex)
  const rightPattern = varNameIndex === -1 ? [] : pattern.slice(varNameIndex + 1)

  function matchLeft(cn: string, pat: ClassNamePattern) {
    let pos = 0
    for (const el of pat) {
      if (typeof el === 'string') {
        if (el !== cn.slice(pos, pos + el.length))
          return false
        pos += el.length
      } else if (el.type === 'counter') {
        const re = /\d/
        if (!cn[pos]?.match(re)) return false
        while (cn[pos]?.match(re)) pos++
      } else if (el.type === 'random') {
        const fragment = cn.slice(pos, pos + el.n)
        if (
          fragment.length !== el.n
          || [...fragment].some(c => !el.possibleChars.includes(c))
        )
          return false
        pos += el.n
      } else if (el.type === 'varName') {
        // multiple var names
        return false
      } else {
        throw new Error(`Unexpected pattern element: ${JSON.stringify(el)} in ${JSON.stringify(pat)}`)
      }
    }
    return pos
  }

  const leftEndPos = matchLeft(className, leftPattern)
  if (leftEndPos === false) return false

  const rightReversedEndPos = matchLeft(reverseStr(className), reversePattern(rightPattern))
  if (rightReversedEndPos === false) return false

  const rightPos = className.length - rightReversedEndPos
  if (leftEndPos > rightPos) return false

  const varNameCandidate = className.slice(leftEndPos, rightPos)
  if (!varNameCandidate) {
    return varNameIndex === -1
  } else if (varNameIndex === -1) {
    return false
  }

  const actualParts = splitName(varNameCandidate)
  const expectedParts = splitName(contextName)

  function partMatches(actual: string, expected: string) {
    // Actual can skip chars but [0] char must match
    if (actual[0] !== expected[0]) return false
    let lastMatchedInExpectedIndex = 0
    for (const c of actual.slice(1)) {
      const i = expected.indexOf(c, lastMatchedInExpectedIndex + 1)
      if (i === -1) return false
      lastMatchedInExpectedIndex = i
    }
    return true
  }

  let lastMatchedExpectedPartIndex = -1
  for (const actualPart of actualParts) {
    const i = expectedParts
      .findIndex((expectedPart, i) =>
        i > lastMatchedExpectedPartIndex && partMatches(actualPart, expectedPart)
      )
    if (i === -1) return false
    lastMatchedExpectedPartIndex = i
  }

  return true
}

function reverseStr(input: string) {
  return [...input].reverse().join('')
}

function reversePattern(pattern: ClassNamePattern) {
  return pattern
    .map(it => typeof it === 'string' ? reverseStr(it) : it)
    .reverse()
}
