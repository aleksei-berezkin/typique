import { type ContextNamePart, splitName } from './names'

export type GeneratedNamePattern = GeneratedNamePatternElement[]
export type GeneratedNamePatternElement = string | VarNamePlaceholder | CounterPlaceholder | RandomPlaceholder
export type VarNamePlaceholder = {
  type: 'contextName'
}
export type CounterPlaceholder = {
  type: 'counter'
}
export type RandomPlaceholder = {
  type: 'random'
  n: number
  possibleChars: string
  maxWordLen: number
  possibleCharsWhenMaxWordLenReached: string
}

export function parseGeneratedNamePattern(input: string): GeneratedNamePattern {
  return [...parseGeneratedNamePatternImpl(input)]
}

const alphabetLowercase = 'abcdefghijklmnopqrstuvwxyz'
const alphabetUppercase = alphabetLowercase.toUpperCase()
const digits = '0123456789'

const alphabet = alphabetLowercase + alphabetUppercase
const alphabetPlusDigits = alphabet + digits
const alphabetUppercasePlusDigits = alphabetUppercase + digits

function* parseGeneratedNamePatternImpl(input: string): IterableIterator<GeneratedNamePatternElement> {
  let curr = 0
  for (const m of input.matchAll(/\$\{(?<ty>contextName|counter|random(?<rndTy>Alpha|Numeric)?\((?<n>\d+)(, *(?<maxWordLen>\d+))?\))\}/g)) {
    if (m.index > curr)
      yield input.slice(curr, m.index)

    const ty = m.groups!.ty
    if (ty === 'contextName')
      yield {type: 'contextName'}
    else if (ty === 'counter')
      yield {type: 'counter'}
    else if (ty.startsWith('random')) {
      const {rndTy, n, maxWordLen} = m.groups!
      yield {
        type: 'random',
        n: +n,
        possibleChars: rndTy === 'Alpha' ? alphabet
          : rndTy === 'Numeric' ? digits
          : alphabetPlusDigits,
        maxWordLen: maxWordLen ? +maxWordLen : +n,
        possibleCharsWhenMaxWordLenReached: rndTy === 'Alpha' ? alphabetUppercase
          : rndTy === 'Numeric' ? digits
          : alphabetUppercasePlusDigits
        
      }
    }

    curr = m.index + m[0].length
  }
  if (curr < input.length)
    yield input.slice(curr)
}

function hasContextName(pattern: GeneratedNamePattern) {
  return pattern.some(it => typeof it === 'object' && it.type === 'contextName')
}
function hasRandom(pattern: GeneratedNamePattern) {
  return pattern.some(it => typeof it === 'object' && it.type.startsWith('random'))
}
function hasExplicitCounter(pattern: GeneratedNamePattern) {
  return pattern.some(it => typeof it === 'object' && it.type === 'counter')
}

export type GenerateCommonParams = {
  pattern: GeneratedNamePattern
  isUsed: (name: string) => boolean
  maxCounter: number
  maxRandomRetries: number
  getRandom: () => number
}

export function generateNamesForOneVar(
  contextNameVariants: string[],
  commonParams: GenerateCommonParams,
) {
  return hasContextName(commonParams.pattern)
    ? contextNameVariants.map(nameVariant => generateMultipleNamesSameWay([nameVariant], commonParams)[0])
    : generateMultipleNamesSameWay([''], commonParams)
}

export function generateNamesForMultipleVars(
  varsContextNames: string[],
  commonParams: GenerateCommonParams,
) {
  if (hasContextName(commonParams.pattern))
    return generateMultipleNamesSameWay(varsContextNames, commonParams)

  const varsNames: string[] = []
  const varsNamesAwareParams = {
    ...commonParams,
    isUsed: name => commonParams.isUsed(name) || varsNames.includes(name)
  } satisfies GenerateCommonParams

  for (const _ of varsContextNames) {
    varsNames.push(generateMultipleNamesSameWay([''], varsNamesAwareParams)[0])
  }

  return varsNames
}


function generateMultipleNamesSameWay(
  contextNames: string[],
  commonParams: GenerateCommonParams,
): string[] {
  const {pattern, isUsed, maxCounter, maxRandomRetries, getRandom} = commonParams

  function renderWithCounter(counterValue: number) {
    const {length} = contextNames
    const renderedNames = Array.from({length}, _ => '')
    function appendToEachName(val: string | number | ((i: number) => string)) {
      for (let i = 0; i < length; i++)
        renderedNames[i] += typeof val === 'function' ? val(i) : val
    }

    for (const el of pattern) {
      if (typeof el === 'string')
        appendToEachName(el)
      else if (el.type === 'contextName')
        appendToEachName(i => contextNames[i])
      else if (el.type === 'counter')
        appendToEachName(counterValue)
      else if (el.type === 'random') {
        let currentWordLength = 0
        for (let i = 0; i < el.n; i++) {
          const possibleChars = currentWordLength >= el.maxWordLen
            ? el.possibleCharsWhenMaxWordLenReached
            : el.possibleChars
          const randomChar = possibleChars[Math.floor(getRandom() * possibleChars.length)]
          appendToEachName(randomChar)
          currentWordLength = alphabetUppercase.includes(randomChar) ? 1
            : alphabetLowercase.includes(randomChar) ? currentWordLength + 1
            : 0
        }
      } else
        throw new Error(`Unknown pattern element: ${JSON.stringify(el)}`)
    }

    return renderedNames
  }

  function noneIsUsed(names: string[]) {
    return names.every(cn => !isUsed(cn))
  }

  if (hasRandom(pattern)) {
    for (let i = 0; i < maxRandomRetries; i++) {
      const generatedNames = renderWithCounter(0)
      if (noneIsUsed(generatedNames)) return generatedNames
    }
    
    throw new Error('Too many random retries when generating names')
  }
  
  if (!hasExplicitCounter(pattern)) {
    const generatedNames = renderWithCounter(-1)
    if (noneIsUsed(generatedNames)) return generatedNames

    const newCommonParams = {
      pattern: insertCounter(pattern),
      isUsed,
      maxCounter,
      maxRandomRetries,
      getRandom,
    }

    return generateMultipleNamesSameWay(contextNames, newCommonParams)
  }

  for (let counter = 0; counter <= maxCounter; counter++) {
    const generatedNames = renderWithCounter(counter)
    if (noneIsUsed(generatedNames)) return generatedNames
  }

  throw new Error('Too many retries when generating names')
}

function insertCounter(pattern: GeneratedNamePattern): GeneratedNamePattern {
  const contextNameIndex = pattern.findIndex(it => typeof it === 'object' && it.type === 'contextName')
  const counterInsertionIndex = contextNameIndex === -1 ? pattern.length : contextNameIndex + 1
  return [
    ...pattern.slice(0, counterInsertionIndex),
    '-',
    {type: 'counter'},
    ...pattern.slice(counterInsertionIndex),
  ]
}

export function nameMatchesPattern(name: string, contextNameParts: ContextNamePart[], pattern: GeneratedNamePattern) {
  if (nameMatchesPatternImpl(name, contextNameParts, pattern)) return true

  if (!hasRandom(pattern)
    && !hasExplicitCounter(pattern)
    && nameMatchesPatternImpl(name, contextNameParts, insertCounter(pattern))
  )
    return true

  return false
}

function nameMatchesPatternImpl(name: string, contextNameParts: ContextNamePart[], pattern: GeneratedNamePattern) {
  const contextNameIndex = pattern.findIndex(it => typeof it === 'object' && it.type === 'contextName')
  const leftPattern = contextNameIndex === -1 ? pattern : pattern.slice(0, contextNameIndex)
  const rightPattern = contextNameIndex === -1 ? [] : pattern.slice(contextNameIndex + 1)

  function matchLeft(nam: string, pat: GeneratedNamePattern) {
    let pos = 0
    for (const el of pat) {
      if (typeof el === 'string') {
        if (el !== nam.slice(pos, pos + el.length))
          return false
        pos += el.length
      } else if (el.type === 'counter') {
        const re = /\d/
        if (!nam[pos]?.match(re)) return false
        while (nam[pos]?.match(re)) pos++
      } else if (el.type === 'random') {
        const fragment = nam.slice(pos, pos + el.n)
        if (
          fragment.length !== el.n
          || [...fragment].some(c => !el.possibleChars.includes(c))
          || el.maxWordLen < fragment.length && (getLongestWord(fragment) ?? '').length > el.maxWordLen
        )
          return false
        pos += el.n
      } else if (el.type === 'contextName') {
        // multiple ${contextName} -- cannot match
        return false
      } else {
        throw new Error(`Unexpected pattern element: ${JSON.stringify(el)} in ${JSON.stringify(pat)}`)
      }
    }
    return pos
  }

  const leftEndPos = matchLeft(name, leftPattern)
  if (leftEndPos === false) return false

  const rightReversedEndPos = matchLeft(reverseStr(name), reversePattern(rightPattern))
  if (rightReversedEndPos === false) return false

  const rightPos = name.length - rightReversedEndPos
  if (leftEndPos > rightPos) return false

  const contextNameCandidate = name.slice(leftEndPos, rightPos)
  if (!contextNameCandidate) {
    return contextNameIndex === -1
  } else if (contextNameIndex === -1) {
    return false
  }

  const actualParts = [...splitName([contextNameCandidate])]
  const expectedParts = [...splitName(contextNameParts.map(({text}) => text))]

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

export function getLongestWord(input: string) {
  const words = [...input.matchAll(/[A-Za-z][a-z]+/g)]
  if (words.length) {
    const longestWord = words
      .map(m => m[0])
      .reduce((w0, w1) => w0.length > w1.length ? w0 : w1)
    return longestWord
  }
}

function reverseStr(input: string) {
  return [...input].reverse().join('')
}

function reversePattern(pattern: GeneratedNamePattern) {
  return pattern
    .map(it => typeof it === 'string' ? reverseStr(it) : it)
    .reverse()
}
