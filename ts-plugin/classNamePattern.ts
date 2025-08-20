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
