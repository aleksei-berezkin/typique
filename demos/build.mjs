import path from 'node:path'
import fs, { rm } from 'node:fs'
import child_process from 'node:child_process'

const projectBasenames = fs.readdirSync(import.meta.dirname, {withFileTypes: true})
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)

const deploymentDir = path.join(import.meta.dirname, '..', '..', 'typique-demos', 'docs')

if (!fs.lstatSync(deploymentDir).isDirectory())
  throw new Error(`Is not a directory: ${deploymentDir}`)

for (const projectBasename of projectBasenames) {
  const projectDir = path.join(import.meta.dirname, projectBasename);

  // TODO Svelte css path
  ['out', 'dist'].forEach(f => rmDirIfExists(path.join(projectDir, f)))
  rmFileIfExists(path.join(projectDir, 'typique-output.css'))

  child_process.execSync(
    'npm run build',
    {
      cwd: path.join(import.meta.dirname, projectBasename),
      stdio: 'inherit',
    },
  )

  const outDirBasename = projectBasename === 'nextjs-search' || projectBasename === 'vanillajs-buttons' ? 'out'
    : projectBasename === 'qwik-toast' ? 'server'
    : projectBasename === 'svelte-progress' ? 'build'
    : 'dist'

    const outDir = path.join(projectDir, outDirBasename)
  if (!fs.lstatSync(outDir).isDirectory())
    throw new Error(`Output directory not found: ${outDir}`)

  const projectDeploymentDir = path.join(deploymentDir, projectBasename)
  rmDirIfExists(projectDeploymentDir)
  fs.mkdirSync(projectDeploymentDir)

  function copyRecursive(src, dest) {
    fs.readdirSync(src).forEach(f => {
      const srcFile = path.join(src, f)
      const destFile = path.join(dest, f)

      if (fs.lstatSync(srcFile).isDirectory()) {
        fs.mkdirSync(destFile)
        copyRecursive(srcFile, destFile)
      } else {
        fs.copyFileSync(srcFile, destFile)
      }
    })
  }

  console.log('Copying the content of', outDir, 'to', projectDeploymentDir)
  copyRecursive(outDir, projectDeploymentDir)
}


// *** Util ***

function rmFileIfExists(file) {
  if (fs.existsSync(file)) {
    console.log('Removing file', file)
    fs.unlinkSync(file)
  }
}

function rmDirIfExists(dir) {
  if (fs.existsSync(dir)) {
    if (!fs.lstatSync(dir).isDirectory())
      throw new Error(`Is not a directory: ${dir}`)
    console.log('Removing dir', dir)
    fs.rmSync(dir, {recursive: true})
  }
}
