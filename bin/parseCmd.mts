export function parseCmd(argv: string[]) {
  let projectFile: string | undefined
  let tsserver: string | undefined
  let prevArg: '--projectFile' | '--tsserver' | undefined

  let inTsArgs = false
  const tsArgs: string[] = []

  for (const arg of argv.slice(2)) {
    if (inTsArgs) {
      tsArgs.push(arg)
    } else if (prevArg === '--projectFile') {
      projectFile = arg
      prevArg = undefined
    } else if (prevArg === '--tsserver') {
      tsserver = arg
      prevArg = undefined
    } else if (arg === '--projectFile' || arg === '--tsserver') {
      prevArg = arg
    } else if (arg === '--') {
      inTsArgs = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!projectFile)
    throw new Error('--projectFile is required')

  return {
    projectFile,
    tsserver,
    tsArgs,
  }
}
