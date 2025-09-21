import { Span } from './span'
import assert from 'node:assert'

export type ClassNameAndSpans =
  | {
    type: 'empty'
  }
  | {
    type: 'plain'
    nameAndSpan: NameAndSpan
  }
  | {
    type: 'array'
    nameAndSpans: ClassNameAndSpans[]
  }
  | {
    type: 'object'
    nameAndSpans: {
      [key in string | number]: ClassNameAndSpans
    }
  }

export type NameAndSpan = {
  name: string
  span: Span
}

export function* unfold(classNameAndSpans: ClassNameAndSpans): IterableIterator<NameAndSpan> {
  for (const [nameAndSpan] of unfoldWithPath(classNameAndSpans, []))
    yield nameAndSpan
}

export function* unfoldWithPath(classNameAndSpans: ClassNameAndSpans, path: (number | string)[]): IterableIterator<[nameAndSpan: NameAndSpan, path: (string | number)[]]> {
  const {type} = classNameAndSpans
  if (type === 'empty')
    return
  else if (type === 'plain')
    yield [classNameAndSpans.nameAndSpan, path.length ? path : [0]]
  else if (type === 'array')
    for (let i = 0; i < classNameAndSpans.nameAndSpans.length; i++)
      yield* unfoldWithPath(classNameAndSpans.nameAndSpans[i], [...path, i])
  else if (type === 'object')
    for (const [key, nameAndSpans] of Object.entries(classNameAndSpans.nameAndSpans))
      yield* unfoldWithPath(nameAndSpans, [...path, key])
  else
    assert(false, `Unexpected classNameAndSpans type: ${type}`)
}

export function resolveClassNameReference(
  reference: string,
  classNameAndSpans: ClassNameAndSpans,
) {
  return resolveClassNameImpl(referenceToPath(reference), classNameAndSpans, true)
}

function resolveClassNameImpl(
  path: (string | number)[],
  classNameAndSpans: ClassNameAndSpans,
  first: boolean = false
): string | undefined {
  const [current, ...tail] = path
  const {type} = classNameAndSpans

  if (type === 'empty') {
    return
  } else if (type === 'plain') {
    if (first && Number(current) === 0 || !first && current == null)
      return classNameAndSpans.nameAndSpan.name
  } else if (type === 'array') {
    const nested = current != null ? classNameAndSpans.nameAndSpans[Number(current)] : undefined
    if (!nested) return
    return resolveClassNameImpl(tail, nested)
  } else if (type === 'object') {
    const nested = classNameAndSpans.nameAndSpans[current]
    if (!nested) return
    return resolveClassNameImpl(tail, nested)
  } else {
    assert(false, `Unexpected classNameAndSpans type: ${type}`)
  }
}

// TODO $00 and $01 won't match $0 and $1 => normalize numbers before check
export function* getUnusedClassNames(usedReferences: Set<string>, classNameAndSpans: ClassNameAndSpans): IterableIterator<NameAndSpan> {
  for (const [nameAndSpan, path] of unfoldWithPath(classNameAndSpans, []))
    if (!usedReferences.has(pathToReference(path)))
      yield nameAndSpan
}

// $0; $1; $lg$0; $bold$sm
export const classNameReferenceRegExp = () => /(?:\$(?:\w+))+/g

export function referenceToPath(reference: string): (string | number)[] {
  const parts = reference.split('$')
  const payload = parts.slice(1)
  assert(
    parts[0] === '' && payload.length && payload.every(p => p !== ''),
    `Invalid reference: ${reference}`
  )
  return payload.map(p => {
    const n = Number(p)
    return isNaN(n) ? p : n
  })
}

export function pathToReference(path: (string | number)[]): string {
  return `$${path.join('$')}`
}
