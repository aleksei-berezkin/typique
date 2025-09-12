export function getNamePayloadIfMatches(name: string, varNameRegex: string): string | undefined {
  const m = name.match(varNameRegex)

  const index = m?.index
  const group = m?.[0]
  if (index == null || group == null) return

  const left = name.slice(0, index)
  const right = name.slice(index + group.length)

  return `${left}${right}`
}

export function getNameVariants(fullName: string): string[] {
  return splitName(fullName)
    .map((_, i, payload) => payload.slice(i).join('-'))
}

export function splitName(name: string): string[] {
  const result: string[] = []
  for (const match of name.matchAll(/[A-Z]*[a-z0-9]*/g)) {
    if (match[0])
      result.push(match[0].toLowerCase())
  }
  return result
}
