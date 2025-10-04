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
export function getNameVariants(contextName: ContextName): string[] {
  return [...splitName(contextName)]
    .map((_, i, payload) => payload.slice(i).join('-'))
}

export function* splitName(contextName: ContextName) {
  for (const part of contextName.parts) {
    for (const match of part.matchAll(/[A-Z]*[a-z0-9]*/g)) {
      if (match[0])
        yield match[0].toLowerCase()
    }
  }
}
