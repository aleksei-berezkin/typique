import { test } from 'test-util'
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
 *   possibly starting with an uppercase letter, or a sequence of uppercase letters. `-` means no limit.
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
 * | 3 | 2 | 1.9e+5 | 22.2 |
 * | 4 | - | 1.5e+7 | 0 |
 * | 4 | 4 | 1.5e+7 | 0 |
 * | 4 | 3 | 1.3e+7 | 9.2 |
 * | 4 | 2 | 9.6e+6 | 34.9 |
 * | 5 | - | 9.2e+8 | 0 |
 * | 5 | 4 | 8.8e+8 | 3.9 |
 * | 5 | 3 | 7.8e+8 | 14.8 |
 * | 5 | 2 | 4.9e+8 | 46.2 |
 * | 6 | - | 5.7e+10 | 0 |
 * | 6 | 4 | 5.3e+10 | 6.3 |
 * | 6 | 3 | 4.5e+10 | 20.2 |
 * | 6 | 2 | 2.5e+10 | 56.2 |
 * | 7 | - | 3.5e+12 | 0 |
 * | 7 | 4 | 3.2e+12 | 8.3 |
 * | 7 | 3 | 2.6e+12 | 25.1 |
 * | 7 | 2 | 1.3e+12 | 63.6 |
 * | 8 | - | 2.2e+14 | 0 |
 * | 8 | 4 | 2.0e+14 | 10.5 |
 * | 8 | 3 | 1.5e+14 | 30.1 |
 * | 8 | 2 | 6.6e+13 | 69.9 |
 * 
 * ## Pattern: `${randomAlpha(n, maxWordLen)}`
 * | `n` | `maxWordLen` | Total sequences possible | Rejected sequences % |
 * |-|-|-|-|
 * | 3 | - | 1.4e+5 | 0 |
 * | 3 | 4 | 1.4e+5 | 0 |
 * | 3 | 3 | 1.4e+5 | 0 |
 * | 3 | 2 | 8.8e+4 | 37.6 |
 * | 4 | - | 7.3e+6 | 0 |
 * | 4 | 4 | 7.3e+6 | 0 |
 * | 4 | 3 | 5.9e+6 | 18.8 |
 * | 4 | 2 | 3.2e+6 | 56.1 |
 * | 5 | - | 3.8e+8 | 0 |
 * | 5 | 4 | 3.4e+8 | 9.5 |
 * | 5 | 3 | 2.7e+8 | 28.2 |
 * | 5 | 2 | 1.1e+8 | 71.9 |
 * | 6 | - | 2.0e+10 | 0 |
 * | 6 | 4 | 1.7e+10 | 14.0 |
 * | 6 | 3 | 1.2e+10 | 37.7 |
 * | 6 | 2 | 3.7e+9 | 81.2 |
 * | 7 | - | 1.0e+12 | 0 |
 * | 7 | 4 | 8.4e+11 | 18.6 |
 * | 7 | 3 | 5.6e+11 | 45.9 |
 * | 7 | 2 | 1.2e+11 | 87.9 |
 * | 8 | - | 5.3e+13 | 0 |
 * | 8 | 4 | 4.1e+13 | 23.3 |
 * | 8 | 3 | 2.5e+13 | 53.0 |
 * | 8 | 2 | 4.4e+12 | 91.8 |
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
