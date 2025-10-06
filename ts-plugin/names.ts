export function getNamePayloadIfMatches(name: string, varNameRegex: string): string | undefined {
  const m = name.match(varNameRegex)

  const index = m?.index
  const group = m?.[0]
  if (index == null || group == null) return

  const left = name.slice(0, index)
  const right = name.slice(index + group.length)

  return `${left}${right}`
}

export type ContextName = {
  type: 'default' | 'tsx'
  parts: string[]
}

export function* getVarNameVariants(contextName: ContextName): IterableIterator<string, undefined, undefined> {
  const parts = [...splitName(contextName)]
  for (let i = 0; i < parts.length; i++)
    yield parts.slice(i).join('-')
}

export function* splitName(contextName: ContextName) {
  for (const part of contextName.parts) {
    for (const match of part.matchAll(/[A-Z]*[a-z0-9]*/g)) {
      if (match[0])
        yield match[0].toLowerCase()
    }
  }
}
