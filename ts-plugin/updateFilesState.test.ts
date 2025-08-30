import {test} from 'uvu'
import assert from 'node:assert'
import type { Path, server } from 'typescript/lib/tsserverlibrary'
import { updateFilesState, type FileState, type FileSpan } from './typiquePlugin'
import { BufferWriter } from './BufferWriter'

test('empty', () => {
  const summary = updateFilesState(createMockInfo([]), new Map(), new Map(), () => undefined)
  assert.deepEqual(summary, {added: 0, updated: 0, removed: 0, isRewriteCss: true})
})

test('add one file', () => {
  const maps = createMaps([])

  const summary = updateFilesState(createMockInfo([['a.ts', 1]]), ...maps, () => undefined)
  assert.deepEqual(summary, {added: 1, updated: 0, removed: 0, isRewriteCss: true})

  const [newFilesState] = createMaps([['a.ts', 1, []]])
  assert.deepEqual(
    maps[0],
    newFilesState,
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
        css: new BufferWriter().finallize(),
        diagnostics: []
      }
    )
    for (const className of classNames) {
      const fileSpans = classNamesToFileSpans.get(className) ?? []
      fileSpans.push({
        fileName,
        path: fileName as Path,
        span: {
          start: {
            line: 0,
            character: 0
          },
          end: {
            line: 0,
            character: 1
          }
        }
      })
      classNamesToFileSpans.set(fileName, fileSpans)
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

test.run()
