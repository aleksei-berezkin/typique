import fs from 'node:fs'
import path from 'node:path'


const tsPluginDir = path.join(import.meta.dirname, '..', 'ts-plugin')

for (const fileBasename of fs.readdirSync(tsPluginDir)) {
  if (fileBasename.endsWith('.test.js')) {
    await import(path.join(tsPluginDir, fileBasename))
  }
}

// TODO split plugin-unit vs server-unit tests, test -> test-server, bin/test -> test-bin + up the hierarchy
for (const fileBasename of fs.readdirSync(import.meta.dirname)) {
  if (fileBasename !== 'server.test.ts' && fileBasename.endsWith('.test.ts')) {
    import(path.join(import.meta.dirname, fileBasename))
  }
}
