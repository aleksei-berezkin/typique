import { Span } from './span'
import assert from 'node:assert'

export type NameAndSpansObject =
  | {
    type: 'empty'
  }
  | {
    type: 'plain'
    nameAndSpan: NameAndSpan
  }
  | {
    type: 'array'
    nameAndSpans: NameAndSpansObject[]
  }
  | {
    type: 'object'
    nameAndSpans: {
      [key in string | number]: NameAndSpansObject
    }
  }

export type Name = {
  /**
   * As written in the source code, e.g. btn-${suf}.
   * This field is used to query, compare, generate and check classnames uniqueness.
   */
  inSrc: string
  /**
   * Evaluated by TypeScript, e.g. btn-X8aZ.
   * This field is only used to emit CSS.
   */
  evaluated: string
}

export type NameAndSpan = {
  name: Name
  span: Span
}

export function* unfold(nameAndSpansObject: NameAndSpansObject): IterableIterator<NameAndSpan> {
  for (const [nameAndSpan] of unfoldWithPath(nameAndSpansObject, []))
    yield nameAndSpan
}

export function* unfoldWithPath(nameAndSpansObject: NameAndSpansObject, path: (number | string)[]): IterableIterator<[nameAndSpan: NameAndSpan, path: (string | number)[]]> {
  const {type} = nameAndSpansObject
  if (type === 'empty')
    return
  else if (type === 'plain')
    yield [nameAndSpansObject.nameAndSpan, path.length ? path : [0]]
  else if (type === 'array')
    for (let i = 0; i < nameAndSpansObject.nameAndSpans.length; i++)
      yield* unfoldWithPath(nameAndSpansObject.nameAndSpans[i], [...path, i])
  else if (type === 'object')
    for (const [key, nameAndSpans] of Object.entries(nameAndSpansObject.nameAndSpans))
      yield* unfoldWithPath(nameAndSpans, [...path, key])
  else
    assert(false, `Unexpected NameAndSpansObject type: ${type}`)
}

export function resolveNameReference(
  reference: string,
  nameAndSpansObject: NameAndSpansObject,
) {
  return resolveNameReferenceImpl(referenceToPath(reference), nameAndSpansObject, true)
}

function resolveNameReferenceImpl(
  path: (string | number)[],
  nameAndSpansObject: NameAndSpansObject,
  first: boolean = false
): NameAndSpan | undefined {
  const [current, ...tail] = path
  const {type} = nameAndSpansObject

  if (type === 'empty') {
    return
  } else if (type === 'plain') {
    if (first && Number(current) === 0 || !first && current == null)
      return nameAndSpansObject.nameAndSpan
  } else if (type === 'array') {
    const nested = current != null ? nameAndSpansObject.nameAndSpans[Number(current)] : undefined
    if (!nested) return
    return resolveNameReferenceImpl(tail, nested)
  } else if (type === 'object') {
    const nested = nameAndSpansObject.nameAndSpans[current]
    if (!nested) return
    return resolveNameReferenceImpl(tail, nested)
  } else {
    assert(false, `Unexpected NameAndSpansObject type: ${type}`)
  }
}

// TODO $00 and $01 won't match $0 and $1 => normalize numbers before check
export function* getUnreferencedNames(usedReferences: Set<string>, nameAndSpansObject: NameAndSpansObject): IterableIterator<NameAndSpan> {
  for (const [nameAndSpan, path] of unfoldWithPath(nameAndSpansObject, []))
    if (!usedReferences.has(pathToReference(path)))
      yield nameAndSpan
}

export function getRootReference(nameAndSpansObject: NameAndSpansObject): {nameAndSpan: NameAndSpan, ref: string} | undefined {
  for (const [nameAndSpan, path] of unfoldWithPath(nameAndSpansObject, []))
    return {nameAndSpan, ref: pathToReference(path)}
  }

// $0; $1; $lg$0; $bold$sm; $sz$x-l
export const referenceRegExp = () => /(?:\$(?:[\w-]+))+/g

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
