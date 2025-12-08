export function getNamePayloadIfMatches(name: string | undefined, varNameRegexp: string): string | undefined {
  if (name == null) return

  const m = name.match(varNameRegexp)

  const index = m?.index
  const group = m?.[0]
  if (index == null || group == null) return

  const left = name.slice(0, index)
  const right = name.slice(index + group.length)

  return `${left}${right}`
}

export type ContextNamePart = {
  sourceKind: 'functionName' | 'variableName' | 'objectPropertyName' | 'jsxElementName' | 'default'
  text: string
}

export function* getContextNameVariants(contextNameParts: ContextNamePart[]): IterableIterator<string, undefined, undefined> {
  const firstVariantParts = [...removeConsecutiveButLastTsx(contextNameParts)]
  const flatParts = [...splitName(firstVariantParts.map(({text}) => text))]
  if (!flatParts.length) return

  yield flatParts.join('-')

  for (const importantParts of getBestCombinations(flatParts))
    yield importantParts.join('-')
}

function* removeConsecutiveButLastTsx(contextNameParts: ContextNamePart[]) {
  let suspendedTsx: ContextNamePart | undefined
  for (const part of contextNameParts) {
    if (part.sourceKind === 'jsxElementName') {
      suspendedTsx = part
    } else {
      if (suspendedTsx) {
        yield suspendedTsx
        suspendedTsx = undefined
      }
      yield part
    }
  }
  if (suspendedTsx) yield suspendedTsx
}

function* getBestCombinations(parts: string[]): IterableIterator<string[]> {
  for (let combinationSize = Math.min(4, parts.length - 1); combinationSize > 0; combinationSize--) {
    const getCombinationIndices = function* (...alreadyIndices: number[]): IterableIterator<number[]> {
      if (alreadyIndices.length === combinationSize) yield alreadyIndices
      for (let i = alreadyIndices.length ? alreadyIndices[alreadyIndices.length - 1] + 1 : 0; i < parts.length; i++)
        yield* getCombinationIndices(...alreadyIndices, i)
    }

    const combinationsIndices = [...getCombinationIndices()]
    const combinationsLengths = new Map<number[], number>()
    for (const combinationIndices of combinationsIndices)
      combinationsLengths.set(
        combinationIndices,
        combinationIndices
          .map(i => parts[i].length)
          .reduce((l, m) => l + m, 0)
      )

    const bestCombinationsIndices = combinationsIndices
      .sort((c, d) => {
        const lengthDiff = combinationsLengths.get(d)! - combinationsLengths.get(c)!
        if (lengthDiff) return lengthDiff

        // Prefer parts that stay closer to the right side
        // E.g. for [btn, sz, lg], the combination [btn, lg] is preferred over [btn, sz]
        return c.reduce((acc, curr, i) => acc + d[i] - curr, 0)
      })
      .slice(0, 2)

    for (const combinationIndices of bestCombinationsIndices)
      yield combinationIndices.map(i => parts[i])
  }
}

export function* splitName(parts: string[]) {
  for (const part of parts) {
    for (const match of part.matchAll(/[A-Z]*[a-z0-9]*/g)) {
      if (match[0])
        yield match[0].toLowerCase()
    }
  }
}
