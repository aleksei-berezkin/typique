import {test} from 'uvu'
import assert from 'node:assert'
import type { Path, server } from 'typescript/lib/tsserverlibrary'
import { updateFilesState, type FileOutput, type FileState, type FileSpan } from './typiquePlugin'
import { BufferWriter } from './BufferWriter'

const baseSummary = {
  added: 0,
  updated: 0,
  removed: 0,
  isRewriteCss: true
}

test('test maps', () => {
  const [filesState, classNamesToFileSpans] = mockMaps(['a.ts', 1, ['a', 'b']], ['b.ts', 2, ['b', 'c', 'd']], ['c.ts', 1, []], ['d.ts', 0, undefined])

  assert.deepEqual([...filesState.keys()], ['a.ts', 'b.ts', 'c.ts', 'd.ts'])
  assert.deepEqual(
    filesState.get('a.ts' as Path),
    {version: '1', classNames: new Set(['a', 'b']), diagnostics: [], css: mockCss(['a', 'b'])}
  )
  assert.deepEqual(
    filesState.get('b.ts' as Path),
    {version: '2', classNames: new Set(['b', 'c', 'd']), diagnostics: [], css: mockCss(['b', 'c', 'd'])}
  )
  assert.deepEqual(
    filesState.get('c.ts' as Path),
    {version: '1', classNames: new Set(), diagnostics: [], css: mockCss([])}
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

test('empty', () => {
  const summary = updateFilesState(mockInfo(), ...mockMaps(), mockProcessFile())
  assert.deepEqual(summary, baseSummary)
})

test('no changes', () => {
  type T3 = [unknown, unknown, unknown]
  const initialState = [['a.ts', 1, ['a', 'b']] satisfies T3, ['b.ts', 2, ['b', 'c']] satisfies T3]

  const maps = mockMaps(...initialState)
  const summary = updateFilesState(
    mockInfo(['a.ts', 1], ['b.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['x']], ['b.ts', ['y']]),
  )
  assert.deepEqual(summary, {...baseSummary, isRewriteCss: false})
  assert.deepEqual(maps, mockMaps(...initialState))
})

test('add one file no classes', () => {
  const maps = mockMaps()

  const summary = updateFilesState(mockInfo(['a.ts', 1]), ...maps, mockProcessFile())
  assert.deepEqual(summary, {...baseSummary, added: 1})

  assert.deepEqual(maps, mockMaps(['a.ts', 1, []]))
})

test('add one file with classes', () => {
  const maps = mockMaps()
  const summary = updateFilesState(
    mockInfo(['a.ts', 1]),
    ...maps,
    mockProcessFile(['a.ts', ['a', 'b']]),
  )
  assert.deepEqual(summary, {...baseSummary, added: 1})

  assert.deepEqual(maps, mockMaps(['a.ts', 1, ['a', 'b']]))
})

test('update one file add class', () => {
  const maps = mockMaps(['a.ts', 1, undefined])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['a']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: 1})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['a']]))
})

test('update one file change classes', () => {
  const maps = mockMaps(['a.ts', 1, ['a']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['b']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: 1})

  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['b']]))
})

test('update one file remove class', () => {
  const maps = mockMaps(['a.ts', 1, ['a', 'b']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['a']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: 1})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['a']]))
})

test('update two files move classes', () => {
  const maps = mockMaps(['a.ts', 1, ['a', 'c']], ['b.ts', 1, ['b', 'c']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2], ['b.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['b', 'c']], ['b.ts', ['a', 'c']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: 2})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['b', 'c']], ['b.ts', 2, ['a', 'c']]))
})

test('update file no rewrite css', () => {
  const maps = mockMaps(['a.ts', 1, ['a']])
  const summary1 = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['a']]),
  )
  assert.deepEqual(summary1, {...baseSummary, updated: 1, isRewriteCss: false})
})

test('add one update another move', () => {
  const maps = mockMaps(['a.ts', 1, ['a']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2], ['b.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', []], ['b.ts', ['a']]),
  )
  assert.deepEqual(summary, {...baseSummary, added: 1, updated: 1})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, []], ['b.ts', 2, ['a']]))
})

test('remove one', () => {
  const maps = mockMaps(['a.ts', 1, ['a']])
  const summary = updateFilesState(
    mockInfo(),
    ...maps,
    mockProcessFile(),
  )
  assert.deepEqual(summary, {...baseSummary, removed: 1})
  assert.deepEqual(maps, mockMaps())
})

test('move', () => {
  const maps = mockMaps(['a.ts', 1, ['a', 'b']])
  const summary = updateFilesState(
    mockInfo(['b.ts', 1]),
    ...maps,
    mockProcessFile(['b.ts', ['a', 'b']]),
  )
  assert.deepEqual(summary, {...baseSummary, added: 1, removed: 1})
  assert.deepEqual(maps, mockMaps(['b.ts', 1, ['a', 'b']]))
})

test('remove and move', () => {
  const maps = mockMaps(['a.ts', 1, ['a']], ['b.ts', 1, ['b']])
  const summary = updateFilesState(
    mockInfo(['b.ts', 2]),
    ...maps,
    mockProcessFile(['b.ts', ['b', 'a']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: 1, removed: 1})
  assert.deepEqual(maps, mockMaps(['b.ts', 2, ['b', 'a']]))
})

test('multiple', () => {
  const maps = mockMaps(['a.ts', 1, ['a']], ['b.ts', 1, ['b']], ['c.ts', 1, ['c']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2], ['c.ts', 2], ['d.ts', 1]),
    ...maps,
    mockProcessFile(['a.ts', ['a', 'b']], ['c.ts', ['b']], ['d.ts', []]),
  )
  assert.deepEqual(summary, {added: 1, updated: 2, removed: 1, isRewriteCss: true})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['a', 'b']], ['c.ts', 2, ['b']], ['d.ts', 1, []]))
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
        classNames: classNames && new Set(classNames),
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
  return wr.finalize()
}

function mockSpan(index: number) {
  return {
    start: {line: 0, character: index},
    end: {line: 0, character: index + 1}
  }
}
