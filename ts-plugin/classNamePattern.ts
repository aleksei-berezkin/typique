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
  for (const m of input.matchAll(/\$\{(?<ty>varName|counter|random(?<rndTy>Alpha|Numeric|AlphaNumeric)?\((?<n>\d+)\))\}/g)) {
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
        : rndTy === 'AlphaNumeric' ? alphabet + numbers
        : alphabet + numbers + '-_'
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
  isUsed: (className: string) => boolean
  maxCounter: number
  maxRandomRetries: number
  randomGen: () => number
}

export function renderClassNamesForOneVar(
  pattern: ClassNamePattern,
  varNameVariants: string[],
  commonParams: RenderCommonParams,
) {
  return hasVarName(pattern)
    ? varNameVariants.map(nameVariant => renderMultipleClassNamesSameWay(pattern, [nameVariant], commonParams)[0])
    : renderMultipleClassNamesSameWay(pattern, [''], commonParams)
}

export function renderClassNamesForMultipleVars(
  pattern: ClassNamePattern,
  varsNames: string[],
  commonParams: RenderCommonParams,
) {
  if (hasVarName(pattern))
    return renderMultipleClassNamesSameWay(pattern, varsNames, commonParams)

  const classNames: string[] = []
  const createdClassesAwareParams = {
    ...commonParams,
    isUsed: cn => commonParams.isUsed(cn) || classNames.includes(cn)
  } satisfies RenderCommonParams

  for (const _ of varsNames) {
    classNames.push(renderMultipleClassNamesSameWay(pattern, [''], createdClassesAwareParams)[0])
  }

  return classNames
}


function renderMultipleClassNamesSameWay(
  pattern: ClassNamePattern,
  varsNames: string[],
  commonParams: RenderCommonParams,
): string[] {
  const {isUsed, maxCounter, maxRandomRetries, randomGen} = commonParams

  function renderWithCounter(counterValue: number) {
    const classNames: string[][] = varsNames.map(_ => [])
    for (const el of pattern) {
      if (typeof el === 'string')
        classNames.forEach(cn => cn.push(el))
      else if (el.type === 'varName')
        classNames.forEach((cn, i) => cn.push(varsNames[i]))
      else if (el.type === 'counter')
        classNames.forEach(cn => cn.push(String(counterValue)))
      else
        for (let i = 0; i < el.n; i++) {
          const randomChar = el.possibleChars[Math.floor(randomGen() * el.possibleChars.length)]
          classNames.forEach(cn => cn.push(randomChar))
        }
    }
    return classNames.map(cn => cn.join(''))
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

    const varNameIndex = pattern.findIndex(it => typeof it === 'object' && it.type === 'varName')
    const counterInsertionIndex = varNameIndex === -1 ? pattern.length : varNameIndex + 1
    const patternWithExplicitCounter = [
      ...pattern.slice(0, counterInsertionIndex),
      '-',
      {type: 'counter'},
      ...pattern.slice(counterInsertionIndex),
    ] satisfies ClassNamePattern

    return renderMultipleClassNamesSameWay(patternWithExplicitCounter, varsNames, commonParams)
  }

  for (let counter = 0; counter <= maxCounter; counter++) {
    const classNames = renderWithCounter(counter)
    if (noneIsUsed(classNames)) return classNames
  }

  throw new Error('Too many class names')
}
