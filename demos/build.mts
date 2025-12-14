import assert from 'node:assert'
import child_process from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const projects = {
  'nextjs-combobox': {
    outDir: 'out',
    cssFile: 'typique-output.css',
  },
  'qwik-toast': {
    outDir: 'dist/typique-demos/qwik-toast',
    cssFile: 'typique-output.css',
  },
  'solidjs-accordion': {
    outDir: 'dist',
    cssFile: 'typique-output.css',
  },
  'svelte-progress': {
    outDir: 'build',
    cssFile: 'static/typique-output.css',
  },
  'vanillajs-buttons': {
    outDir: 'out',
    cssFile: 'typique-output.css',
  },
  'vue-todo-list': {
    outDir: 'dist',
    cssFile: 'typique-output.css',
  },
}

const deploymentDir = path.join(import.meta.dirname, '..', '..', 'typique-demos', 'docs')

if (!fs.lstatSync(deploymentDir).isDirectory())
  throw new Error(`Is not a directory: ${deploymentDir}`)

const linksDeploymentInIndex = String(fs.readFileSync(path.join(deploymentDir, 'index.html')))
  .split('\n')
  .map(l => /<li><a href="\/typique-demos\/([\w-]+)"/.exec(l)?.[1])
  .filter(Boolean)

assert.deepStrictEqual(
  new Set(linksDeploymentInIndex),
  new Set(Object.keys(projects)),
  'docs/index.html must contain links to all projects',
)

const filter = process.argv[2]

for (const [projectBasename, projectSpec] of Object.entries(projects)) {
  if (filter && !projectBasename.includes(filter)) {
    console.log('Skipping', projectBasename)
    continue
  }

  const projectDir = path.join(import.meta.dirname, projectBasename)

  rmDirRecursiveIfExists(path.join(projectDir, projectSpec.outDir))
  rmFileIfExists(path.join(projectDir, projectSpec.cssFile))

  child_process.execSync(
    'npm run build',
    {
      cwd: path.join(import.meta.dirname, projectBasename),
      stdio: 'inherit',
    },
  )

  const outDir = path.join(projectDir, projectSpec.outDir)
  if (!fs.lstatSync(outDir).isDirectory())
    throw new Error(`Output directory not found: ${outDir}`)

  const projectDeploymentDir = path.join(deploymentDir, projectBasename)
  rmDirRecursiveIfExists(projectDeploymentDir)
  fs.mkdirSync(projectDeploymentDir)

  function copyDirRecursive(src: string, dest: string) {
    for (const dirent of fs.readdirSync(src, {withFileTypes: true})) {
      const srcFile = path.join(src, dirent.name)
      const destFile = path.join(dest, dirent.name)
  
      if (dirent.isDirectory()) {
        fs.mkdirSync(destFile)
        copyDirRecursive(srcFile, destFile)
      } else {
        fs.copyFileSync(srcFile, destFile)
      }
    }
  }

  console.log('Copying the content of', outDir, 'to', projectDeploymentDir)
  copyDirRecursive(outDir, projectDeploymentDir)
}


// *** Util ***

function rmFileIfExists(file: string) {
  if (fs.existsSync(file)) {
    console.log('Removing file', file)
    fs.unlinkSync(file)
  }
}

function rmDirRecursiveIfExists(dir: string) {
  if (fs.existsSync(dir)) {
    if (!fs.lstatSync(dir).isDirectory())
      throw new Error(`Is not a directory: ${dir}`)
    console.log('Removing dir', dir)
    fs.rmSync(dir, {recursive: true})
  }
}
