import type ts from 'typescript'
import fs from 'node:fs'

const fileToLineStartOffsets = new Map<string, number[]>()

export async function offsetToLineAndCharacter(fileName: string, offset: number /* 0-based */): Promise<ts.LineAndCharacter> {
  const lineStartOffsets = await loadLineStartOffsets(fileName)
  if (!lineStartOffsets.length) {
    if (!offset)
      return {line: 0, character: 0}
    else
      throw new Error(`File is empty: ${fileName}, offset=${offset}`)
  }

  const line = binSearchLine(lineStartOffsets, offset)
  const character = offset - lineStartOffsets[line]
  return {line, character}
}

async function loadLineStartOffsets(fileName: string) {
  if (fileToLineStartOffsets.has(fileName)) return fileToLineStartOffsets.get(fileName)!

  const content = (await fs.promises.readFile(fileName, {encoding: 'utf-8'}))
  const lineStartOffsets = getLineStartOffsets(content)
  fileToLineStartOffsets.set(fileName, lineStartOffsets)
  return lineStartOffsets
}

export function getLineStartOffsets(content: string): number[] {
  if (!content) return []

  const lineStartOffsets = [0]
  for (let offset = 0; offset < content.length; offset++) {
    if (content[offset] === '\n' && offset !== content.length - 1)
      lineStartOffsets.push(offset + 1)
  }
  return lineStartOffsets
}

export function binSearchLine(lineStartOffsets: number[], offset: number): number {
  if (!lineStartOffsets.length) throw new Error('lineStartOffsets is empty')

  let lo = 0
  let hi = lineStartOffsets.length

  while (lo < hi) {
    const mi = Math.floor((lo + hi) / 2)
    if (offset >= lineStartOffsets[mi]) {
      if (lo === mi)
        break
      else
        lo = mi
    } else
      hi = mi
  }

  return lo
}
