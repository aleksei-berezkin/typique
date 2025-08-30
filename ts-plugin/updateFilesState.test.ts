import {test} from 'uvu'
import assert from 'node:assert'
import type { Path, server } from 'typescript/lib/tsserverlibrary'
import { updateFilesState, type FileOutput, type FileState, type FileSpan } from './typiquePlugin'
import { BufferWriter } from './BufferWriter'

test('empty', () => {
  const summary = updateFilesState(createMockInfo([]), ...createMaps([]), createMockProcessFile([]))
  assert.deepEqual(summary, {added: 0, updated: 0, removed: 0, isRewriteCss: true})
})

test('add one file', () => {
  const maps = createMaps([])

  const summary = updateFilesState(createMockInfo([['a.ts', 1]]), ...maps, createMockProcessFile([]))
  assert.deepEqual(summary, {added: 1, updated: 0, removed: 0, isRewriteCss: true})

  const [newFilesState] = createMaps([['a.ts', 1, []]])
  assert.deepEqual(
    maps[0],
    newFilesState,
  )
})

test('update one file', () => {
  const maps = createMaps([['a.ts', 1, ['a']]])
  const summary = updateFilesState(
    createMockInfo([['a.ts', 2]]),
    ...maps,
    createMockProcessFile([['a.ts', ['b']]]),
  )
  assert.deepEqual(summary, {added: 0, updated: 1, removed: 0, isRewriteCss: true})

  const newMaps = createMaps([['a.ts', 2, ['b']]])
  assert.deepEqual(
    maps,
    newMaps,
  )
})

function createMaps(fileNamesAndVersionsAndClassNames: [fileName: string, version: number, classNames: string[]][]): [
  filesState: Map<Path, FileState>,
  classNamesToFileSpans: Map<string, FileSpan[]>,
] {
  const filesState = new Map<Path, FileState>()
  const classNamesToFileSpans = new Map<string, FileSpan[]>()
  for (const [fileName, version, classNames] of fileNamesAndVersionsAndClassNames) {
    filesState.set(
      fileName as Path,
      {
        version: String(version),
        classNames,
        css: mockCss(classNames),
        diagnostics: []
      }
    )
    for (let i = 0; i < classNames.length; i++) {
      const fileSpans = classNamesToFileSpans.get(classNames[i]) ?? []
      fileSpans.push({
        fileName,
        path: fileName as Path,
        span: mockSpan(i)
      })
      classNamesToFileSpans.set(classNames[i], fileSpans)
    }
  }
  return [filesState, classNamesToFileSpans]
}

function createMockInfo(fileNamesAndVersions: [name: string, version: number][]): server.PluginCreateInfo {
  return {
    project: {
      getProjectName() {
        return 'Mock project'
      },
      getFileNames(): string[] {
        return fileNamesAndVersions.map(([name]) => name)
      },
      projectService: {
        getScriptInfo(fileName: string) {
          const fileNameAndVersion = fileNamesAndVersions.find(([name]) => name === fileName)

          return fileNameAndVersion && {
            fileName,
            path: fileName,
            getLatestVersion() {
              return String(fileNameAndVersion[1])
            }
          }
        },
        logger: {
          info() {}
        },
      }
    }
  } as any
}

function createMockProcessFile(fileNamesAndClassNames: [fileName: string, classNames: string[]][]): (path: Path) => FileOutput | undefined {
  return path => {
    const fileNameAndClassNames = fileNamesAndClassNames.find(([name]) => name === path)
    if (!fileNameAndClassNames) return undefined

    const [, classNames] = fileNameAndClassNames

    return {
      css: mockCss(classNames),
      classNameAndSpans: classNames.map((name, index) => ({
        name,
        span: mockSpan(index),
      })),
      diagnostics: [],
    }
  }
}

function mockCss(classNames: string[]) {
  if (!classNames.length) return undefined

  const wr = new BufferWriter()
  wr.write(classNames.join(''))
  return wr.finallize()
}

function mockSpan(index: number) {
  return {
    start: {line: 0, character: index},
    end: {line: 0, character: index + 1}
  }
}

test.run()
