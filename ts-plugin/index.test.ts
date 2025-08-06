import childProcess from 'node:child_process'
import path from 'path'

['util', 'BufferWriter'].forEach((f) => {
  const fileName = `${f}.test.js`
  console.log(`Running ${fileName}...`)
  try {
    childProcess.execSync(`node ${path.join(__dirname, fileName)}`, {
      stdio: 'inherit',
    })
  } catch (e: any) {
    if (e.status === 1) {
      process.exit(1)
    } else {
      throw e
    }
  }
})
