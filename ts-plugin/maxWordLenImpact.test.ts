import { test } from '../testUtil/test.mjs'
import { generateNamesForOneVar, getLongestWord, parseGeneratedNamePattern } from './generateNames'


test('estimate words fraction random', () => {
  if (Math.random() < 1) return // skip
  estimateWordsFraction('random')
})

test('estimate words fraction randomAlpha', () => {
  if (Math.random() < 1) return // skip
  estimateWordsFraction('randomAlpha')
})

/**
 * These tests estimate how `maxWordLen` reduces the number of generated random sequences.
 * The tables below have the following columns:
 * 
 * - `n` - the length of the generated sequence
 * - `maxWordLen` - limits the maximal length of a "word", which is a sequence of lowercase letters
 *   possibly starting with an uppercase letter. `-` means no limit.
 * - Total sequences possible - the total number of possible generated sequences. For limited `maxWordLen`
 *   this number is estimated; for unlimited `maxWordLen` it is calculated.
 * - Rejected sequences % - the percent of sequences which do not pass the `maxWordLen` filter; in other words,
 *   it's how `maxWordLen` reduces the number of possible sequences compared to the test with unlimited `maxWordLen`.
 * 
 * ## Pattern: `${random(n, maxWordLen)}`
 * 
 * | `n` | `maxWordLen` | Total sequences possible | Rejected sequences % |
 * |-|-|-|-|
 * | 3 | - | 2.4e+5 | 0 |
 * | 3 | 4 | 2.4e+5 | 0 |
 * | 3 | 3 | 2.4e+5 | 0 |
 * | 3 | 2 | 2.0e+5 | 14.8 |
 * | 4 | - | 1.5e+7 | 0 |
 * | 4 | 4 | 1.5e+7 | 0 |
 * | 4 | 3 | 1.4e+7 | 6.1 |
 * | 4 | 2 | 1.1e+7 | 23.5 |
 * | 5 | - | 9.2e+8 | 0 |
 * | 5 | 4 | 8.9e+8 | 2.7 |
 * | 5 | 3 | 8.3e+8 | 9.8 |
 * | 5 | 2 | 6.2e+8 | 31.8 |
 * | 6 | - | 5.7e+10 | 0 |
 * | 6 | 4 | 5.4e+10 | 4.1 |
 * | 6 | 3 | 4.9e+10 | 13.3 |
 * | 6 | 2 | 3.4e+10 | 39.4 |
 * | 7 | - | 3.5e+12 | 0 |
 * | 7 | 4 | 3.3e+12 | 5.6 |
 * | 7 | 3 | 2.9e+12 | 16.9 |
 * | 7 | 2 | 1.9e+12 | 46.2 |
 * | 8 | - | 2.2e+14 | 0 |
 * | 8 | 4 | 2.0e+14 | 7.0 |
 * | 8 | 3 | 1.7e+14 | 20.4 |
 * | 8 | 2 | 1.0e+14 | 52.1 |
 * 
 * ## Pattern: `${randomAlpha(n, maxWordLen)}`
 * | `n` | `maxWordLen` | Total sequences possible | Rejected sequences % |
 * |-|-|-|-|
 * | 3 | - | 1.4e+5 | 0 |
 * | 3 | 4 | 1.4e+5 | 0 |
 * | 3 | 3 | 1.4e+5 | 0 |
 * | 3 | 2 | 1.1e+5 | 24.9 |
 * | 4 | - | 7.3e+6 | 0 |
 * | 4 | 4 | 7.3e+6 | 0 |
 * | 4 | 3 | 6.4e+6 | 12.6 |
 * | 4 | 2 | 4.6e+6 | 37.4 |
 * | 5 | - | 3.8e+8 | 0 |
 * | 5 | 4 | 3.6e+8 | 6.3 |
 * | 5 | 3 | 3.1e+8 | 18.6 |
 * | 5 | 2 | 1.9e+8 | 50.1 |
 * | 6 | - | 2.0e+10 | 0 |
 * | 6 | 4 | 1.8e+10 | 9.5 |
 * | 6 | 3 | 1.5e+10 | 25.0 |
 * | 6 | 2 | 8.1e+9 | 59.2 |
 * | 7 | - | 1.0e+12 | 0 |
 * | 7 | 4 | 9.0e+11 | 12.6 |
 * | 7 | 3 | 7.1e+11 | 31.3 |
 * | 7 | 2 | 3.4e+11 | 67.1 |
 * | 8 | - | 5.3e+13 | 0 |
 * | 8 | 4 | 4.5e+13 | 15.5 |
 * | 8 | 3 | 3.4e+13 | 36.5 |
 * | 8 | 2 | 1.4e+13 | 73.5 |
 * 
 */
function estimateWordsFraction(kind: 'random' | 'randomAlpha') {
  console.log(kind)

  function printTable(... args: (string | number)[]) {
      console.log(
        ' * |',
        args.join(' | '),
        '|'
      )
  }

  for (const patternLen of [3, 4, 5, 6, 7, 8]) {
    const pattern = parseGeneratedNamePattern(
      kind === 'random'
        ? `\${random(${patternLen})}`
        : `\${randomAlpha(${patternLen})}`
    )

    const totalWordsPossible = (kind === 'random' ? 26 * 2 + 10 : 26 * 2) ** patternLen

    printTable(
      patternLen,
      '-',
      totalWordsPossible.toExponential(1),
      0,
    )

    for (const maxWordLen of [4, 3, 2]) {
      const testsCount = 100_000
      let rejectedCount = 0
      for (let i = 0; i < testsCount; i++) {
        const [className] = generateNamesForOneVar(
          [],
          {
            pattern,
            isUsed: () => false,
            maxCounter: 1,
            maxRandomRetries: 1,
            getRandom: () => Math.random()
          }
        )
        const longestWord = getLongestWord(className)
        if (longestWord && longestWord.length > maxWordLen) rejectedCount++
      }
      const rejectedFraction = rejectedCount / testsCount
      const passingWords = totalWordsPossible * (1 - rejectedFraction)
      printTable(
        patternLen,
        maxWordLen,
        passingWords.toExponential(1),
        rejectedFraction === 0 ? 0 : (rejectedFraction * 100).toFixed(1),
      )
    }
  }
}
