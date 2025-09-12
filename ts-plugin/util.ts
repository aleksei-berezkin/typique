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
