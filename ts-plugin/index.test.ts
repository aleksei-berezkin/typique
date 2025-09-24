import fs from 'node:fs'
import path from 'node:path'
import { suite } from '../testUtil/test.mjs'

const fileBasenames = fs.readdirSync(__dirname)
  .filter(f =>
    f !== path.basename(__filename) && f.endsWith('.test.js')
  );

for (const fileBasename of fileBasenames) {
  import(path.join(__dirname, fileBasename))
}
