export type ClassNamePattern = ClassNamePatterElement[]
export type ClassNamePatterElement = string | VarNamePlaceholder | CounterPlaceholder | RandomPlaceholder
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

function* parseClassNamePatternImpl(input: string): IterableIterator<ClassNamePatterElement> {
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

export function renderCompletionItems(
  pattern: ClassNamePattern,
  varNameVariants: string[],
  existingClassNames: Map<string, unknown>,
  maxCounter: number,
  maxRandomRetries: number,
  randomGen: () => number
) {
  const hasVarName = pattern.some(it => typeof it === 'object' && it.type === 'varName')
  const hasRandom = pattern.some(it => typeof it === 'object' && it.type.startsWith('random'))
  function hasExplicitCounter(p: ClassNamePattern) {
    return p.some(it => typeof it === 'object' && it.type === 'counter')
  }

  function renderOneVariant(patternImpl: ClassNamePattern, varName: string) {
    if (hasRandom) {
      for (let i = 0; i < maxRandomRetries; i++) {
        const item = doRender(pattern, varName, 0)
        if (!existingClassNames.has(item)) return item
      }
      
      throw new Error('Too many random class names')
    }
    
    if (!hasExplicitCounter(patternImpl)) {
      const item = doRender(patternImpl, varName, -1)
      if (!existingClassNames.has(item)) return item

      const varNameIndex = patternImpl.findIndex(it => typeof it === 'object' && it.type === 'varName')
      const insertionIndex = varNameIndex === -1 ? patternImpl.length : varNameIndex + 1
      const newPatternImpl = [
        ...patternImpl.slice(0, insertionIndex),
        '-',
        {type: 'counter'},
        ...patternImpl.slice(insertionIndex),
      ] satisfies ClassNamePattern

      return renderOneVariant(newPatternImpl, varName)
    }

    for (let counter = 0; counter <= maxCounter; counter++) {
      const item = doRender(patternImpl, varName, counter)
      if (!existingClassNames.has(item)) return item
    }

    throw new Error('Too many class names')
  }

  function doRender(patternImpl: ClassNamePattern, varName: string, counterValue: number) {
    const out: string[] = []
    for (const it of patternImpl) {
      if (typeof it === 'string')
        out.push(it)
      else if (it.type === 'varName')
        out.push(varName)
      else if (it.type === 'counter')
        out.push(String(counterValue))
      else
        for (let i = 0; i < it.n; i++) out.push(it.possibleChars[Math.floor(randomGen() * it.possibleChars.length)])
    }
    return out.join('')
  }

  return hasVarName
    ? varNameVariants.map(varName => renderOneVariant(pattern, varName))
    : [renderOneVariant(pattern, '')]
}
