export function findClassNameProtectedRanges(input: string): [number, number][] {
  const regex = /"([^"\\]|\\.)+"|'([^'\\]|\\.)+'|url\(\s*([^)"'\s]+)\s*\)/gi;
  const ranges: [number, number][] = [];

  for (const m of input.matchAll(regex)) {
    const g = m[3] ?? m[0]
    ranges.push([m.index, m.index + m[0].length]);
  }

  return ranges;
}

export function camelCaseToKebabCase(s: string) {
  if (!s.match(/^[a-zA-Z0-9_]+$/)) return s
  return s.replace(/[A-Z]/g, s => `-${s.toLowerCase()}`)
}

export function getNameCompletions(name: string, classNameRegex: string): string[] {
  return getNamePayloadIfMatches(name, classNameRegex)
    .map((_, i, payload) => payload.slice(i).join('-'))
}

export function getNamePayloadIfMatches(name: string, classNameRegex: string): string[] {
  const m = name.match(classNameRegex)

  const index = m?.index
  const group = m?.[0]
  if (index == null || group == null) return []

  const left = name.slice(0, index)
  const right = name.slice(index + group.length)

  const namePayload = [...getNamePayload(left), ...getNamePayload(right)]
  return namePayload.length ? namePayload : []
}

export function getNamePayload(name: string): string[] {
  const result: string[] = []
  for (const match of name.matchAll(/[A-Z]*[a-z0-9]*/g)) {
    if (match[0])
      result.push(match[0].toLowerCase())
  }
  return result
}

/**
 * Doesn't work with neg 
 */
export function padZeros(num: number, max: number): string {
  return String(num).padStart(getIntStrLen(max), '0')
}

export function getIntStrLen(num: number) {
  let n = num
  let l = num <= 0 ? 1 : 0
  while (n) {
    l++
    n = Math.trunc(n / 10)
  }
  return l
}
