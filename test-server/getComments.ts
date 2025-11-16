import type ts from 'typescript'

/**
 * Multiline comments (`/*...* /`) but currently supported only on a single line
 */
export type Comment = {
  // 0-based
  start: ts.LineAndCharacter
  end: ts.LineAndCharacter
  innerText: string
}

export function* getComments(lines: string[]) {
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\/\*(?<innerText>([^*]|\*(?!\/))*)\*\//g)) {
      yield {
        start: {line: i, character: m.index},
        end: {line: i, character: m.index + m[0].length},
        innerText: m.groups?.innerText ?? '',
      } satisfies Comment
    }
  }
}
