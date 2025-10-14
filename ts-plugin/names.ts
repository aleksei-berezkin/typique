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

// TODO maybe type ContextName = ContextNamePart[]
// and what is ContextName now (with 'class' and 'var') should be sth different
export type ContextNamePart = {
  sourceKind: 'functionName' | 'variableName' | 'objectPropertyName' | 'tsxElementName'
  text: string
}

export function* getContextNameVariants(contextNameParts: ContextNamePart[]): IterableIterator<string, undefined, undefined> {
  const parts = [...splitName(contextNameParts.map(({text}) => text))]
  for (let i = 0; i < parts.length; i++)
    yield parts.slice(i).join('-')
}

export function* splitName(parts: string[]) {
  for (const part of parts) {
    for (const match of part.matchAll(/[A-Z]*[a-z0-9]*/g)) {
      if (match[0])
        yield match[0].toLowerCase()
    }
  }
}
