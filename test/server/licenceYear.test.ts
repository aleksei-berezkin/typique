import { test } from 'test-util'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const expectedFirstLine = `Copyright ${new Date().getFullYear()} Aleksei Berezkin`

for (const relPath of ['../../LICENSE', '../../packages/typique/LICENSE']) {
  test(relPath, () => {
    assert.strictEqual(getFirstLine(relPath), expectedFirstLine)
  })
}

function getFirstLine(relPath: string) {
  const text = fs.readFileSync(path.join(import.meta.dirname, relPath), {encoding: 'utf-8'})
  return text.split('\n')[0]
}
