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
