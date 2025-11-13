import fs from 'node:fs'
import path from 'node:path'


const tsPluginDir = path.join(import.meta.dirname, '..', 'ts-plugin')
const binDir = path.join(import.meta.dirname, '..', 'bin')

for (const fileBasename of fs.readdirSync(tsPluginDir)) {
  if (fileBasename.endsWith('.test.js')) {
    await import(path.join(tsPluginDir, fileBasename))
  }
}

for (const fileBasename of fs.readdirSync(binDir)) {
  if (fileBasename.endsWith('.test.mjs')) {
    await import(path.join(binDir, fileBasename))
  }
}

for (const fileBasename of fs.readdirSync(import.meta.dirname)) {
  if (fileBasename !== 'server.test.ts' && fileBasename.endsWith('.test.ts')) {
    import(path.join(import.meta.dirname, fileBasename))
  }
}
