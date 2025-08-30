import {test} from 'uvu'
import assert from 'node:assert'
import type { Path, server } from 'typescript/lib/tsserverlibrary'
import { updateFilesState, type FileOutput, type FileState, type FileSpan } from './typiquePlugin'
import { BufferWriter } from './BufferWriter'

test('empty', () => {
  const summary = updateFilesState(mockInfo(), ...mockMaps(), mockProcessFile())
  assert.deepEqual(summary, {added: 0, updated: 0, removed: 0, isRewriteCss: true})
})

test('test maps', () => {
  const [filesState, classNamesToFileSpans] = mockMaps(['a.ts', 1, ['a', 'b']], ['b.ts', 2, ['b', 'c', 'd']], ['c.ts', 1, []], ['d.ts', 0, undefined])

  assert.deepEqual([...filesState.keys()], ['a.ts', 'b.ts', 'c.ts', 'd.ts'])
  assert.deepEqual(
    filesState.get('a.ts' as Path),
    {version: '1', classNames: ['a', 'b'], diagnostics: [], css: mockCss(['a', 'b'])}
  )
  assert.deepEqual(
    filesState.get('b.ts' as Path),
    {version: '2', classNames: ['b', 'c', 'd'], diagnostics: [], css: mockCss(['b', 'c', 'd'])}
  )
  assert.deepEqual(
    filesState.get('c.ts' as Path),
    {version: '1', classNames: [], diagnostics: [], css: mockCss([])}
  )
  assert.deepEqual(
    filesState.get('d.ts' as Path),
    {version: '0', classNames: undefined, diagnostics: [], css: undefined}
  )

  assert.deepEqual([...classNamesToFileSpans.keys()], ['a', 'b', 'c', 'd'])
  assert.deepEqual(
    classNamesToFileSpans.get('a'),
    [{fileName: 'a.ts', path: 'a.ts', span: mockSpan(0)}]
  )
  assert.deepEqual(
    classNamesToFileSpans.get('b'),
    [
      {fileName: 'a.ts', path: 'a.ts', span: mockSpan(1)},
      {fileName: 'b.ts', path: 'b.ts', span: mockSpan(0)},
    ]
  )
  assert.deepEqual(
    classNamesToFileSpans.get('c'),
    [{fileName: 'b.ts', path: 'b.ts', span: mockSpan(1)}]
  )
  assert.deepEqual(
    classNamesToFileSpans.get('d'),
    [{fileName: 'b.ts', path: 'b.ts', span: mockSpan(2)}]
  )
})

test('add one file', () => {
  const maps = mockMaps()

  const summary = updateFilesState(mockInfo(['a.ts', 1]), ...maps, mockProcessFile())
  assert.deepEqual(summary, {added: 1, updated: 0, removed: 0, isRewriteCss: true})

  const newMaps = mockMaps(['a.ts', 1, []])
  assert.deepEqual(maps, newMaps)
})

test('update one file', () => {
  const maps = mockMaps(['a.ts', 1, ['a']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['b']]),
  )
  assert.deepEqual(summary, {added: 0, updated: 1, removed: 0, isRewriteCss: true})

  const newMaps = mockMaps(['a.ts', 2, ['b']])
  assert.deepEqual(maps, newMaps)
})

test.run()

// *** Utils ***

function mockMaps(...fileNamesAndVersionsAndClassNames: [fileName: string, version: number, classNames: string[] | undefined][]): [
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
    for (let i = 0; i < (classNames?.length ?? 0); i++) {
      const fileSpans = classNamesToFileSpans.get(classNames![i]) ?? []
      fileSpans.push({
        fileName,
        path: fileName as Path,
        span: mockSpan(i)
      })
      classNamesToFileSpans.set(classNames![i], fileSpans)
    }
  }
  return [filesState, classNamesToFileSpans]
}

function mockInfo(...fileNamesAndVersions: [name: string, version: number][]): server.PluginCreateInfo {
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

function mockProcessFile(...fileNamesAndClassNames: [fileName: string, classNames: string[]][]): (path: Path) => FileOutput | undefined {
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

function mockCss(classNames: string[] | undefined) {
  if (!classNames?.length) return undefined

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
