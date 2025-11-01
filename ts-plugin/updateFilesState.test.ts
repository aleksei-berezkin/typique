import { test } from '../testUtil/test.mjs'
import assert from 'node:assert'
import type { server } from 'typescript/lib/tsserverlibrary'
import { updateFilesState, type FileOutput, type FileState, type FileSpan } from './typiquePlugin'
import { BufferWriter } from './BufferWriter'

const baseSummary = {
  added: [],
  updated: [],
  removed: [],
  isRewriteCss: true,
}

test('test maps', () => {
  const [filesState, classNamesToFileSpans, varNamesToFileSpans] = mockMaps(
    ['a.ts', 1, ['a', 'b'], ['--v']],
    ['b.ts', 2, ['b', 'c', 'd'], undefined],
    ['c.ts', 1, [], ['--v', '--u']],
    ['d.ts', 0, undefined, []],
  )

  assert.deepEqual([...filesState.keys()], ['a.ts', 'b.ts', 'c.ts', 'd.ts'])
  assert.deepEqual(
    filesState.get('a.ts' as server.NormalizedPath),
    {version: '1', classNames: new Set(['a', 'b']), varNames: new Set(['--v']), diagnostics: [], css: mockCss(['a', 'b'], ['--v'])}
  )
  assert.deepEqual(
    filesState.get('b.ts' as server.NormalizedPath),
    {version: '2', classNames: new Set(['b', 'c', 'd']), varNames: undefined, diagnostics: [], css: mockCss(['b', 'c', 'd'], [])}
  )
  assert.deepEqual(
    filesState.get('c.ts' as server.NormalizedPath),
    {version: '1', classNames: new Set(), varNames: new Set(['--v', '--u']), diagnostics: [], css: mockCss([], ['--v', '--u'])}
  )
  assert.deepEqual(
    filesState.get('d.ts' as server.NormalizedPath),
    {version: '0', classNames: undefined, varNames: new Set(), diagnostics: [], css: undefined}
  )

  assert.deepEqual([...classNamesToFileSpans.keys()], ['a', 'b', 'c', 'd'])
  assert.deepEqual(
    classNamesToFileSpans.get('a'),
    [{fileName: 'a.ts', span: mockSpan(0)}]
  )
  assert.deepEqual(
    classNamesToFileSpans.get('b'),
    [
      {fileName: 'a.ts', span: mockSpan(1)},
      {fileName: 'b.ts', span: mockSpan(0)},
    ]
  )
  assert.deepEqual(
    classNamesToFileSpans.get('c'),
    [{fileName: 'b.ts', span: mockSpan(1)}]
  )
  assert.deepEqual(
    classNamesToFileSpans.get('d'),
    [{fileName: 'b.ts', span: mockSpan(2)}]
  )

  assert.deepEqual([...varNamesToFileSpans.keys()], ['--v', '--u'])
  assert.deepEqual(
    varNamesToFileSpans.get('--v'),
    [
      {fileName: 'a.ts', span: mockSpan(0)},
      {fileName: 'c.ts', span: mockSpan(0)},
    ]
  )

  assert.deepEqual(
    varNamesToFileSpans.get('--u'),
    [{fileName: 'c.ts', span: mockSpan(1)}]
  )
})

test('empty', () => {
  const summary = updateFilesState(mockInfo(), ...mockMaps(), mockProcessFile())
  assert.deepEqual(summary, baseSummary)
})

test('no changes', () => {
  type T4 = [unknown, unknown, unknown, unknown]
  const initialState = [['a.ts', 1, ['a', 'b'], ['--v']] satisfies T4, ['b.ts', 2, ['b', 'c'], undefined] satisfies T4]

  const maps = mockMaps(...initialState)
  const summary = updateFilesState(
    mockInfo(['a.ts', 1], ['b.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['x'], ['--x']], ['b.ts', ['y'], ['--y']]),
  )
  assert.deepEqual(summary, {...baseSummary, isRewriteCss: false})
  assert.deepEqual(maps, mockMaps(...initialState))
})

test('add one file no classes no vars', () => {
  const maps = mockMaps()

  const summary = updateFilesState(mockInfo(['a.ts', 1]), ...maps, mockProcessFile())
  assert.deepEqual(summary, {...baseSummary, added: ['a.ts']})

  assert.deepEqual(maps, mockMaps(['a.ts', 1, [], []]))
})

test('add one file with classes and vars', () => {
  const maps = mockMaps()
  const summary = updateFilesState(
    mockInfo(['a.ts', 1]),
    ...maps,
    mockProcessFile(['a.ts', ['a', 'b'], ['--v', '--u']]),
  )
  assert.deepEqual(summary, {...baseSummary, added: ['a.ts']})

  assert.deepEqual(maps, mockMaps(['a.ts', 1, ['a', 'b'], ['--v', '--u']]))
})


test('update one file add class and var', () => {
  const maps = mockMaps(['a.ts', 1, undefined, undefined])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['a'], ['--v']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: ['a.ts']})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['a'], ['--v']]))
})

test('update one file change classes and vars', () => {
  const maps = mockMaps(['a.ts', 1, ['a'], ['--v']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['b'], ['--u']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: ['a.ts']})

  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['b'], ['--u']]))
})

test('update one file remove class and var', () => {
  const maps = mockMaps(['a.ts', 1, ['a', 'b'], ['--v', '--u']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['a'], ['--v']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: ['a.ts']})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['a'], ['--v']]))
})

test('update two files move classes and vars', () => {
  const maps = mockMaps(['a.ts', 1, ['a', 'c'], ['--v', '--w']], ['b.ts', 1, ['b', 'c'], ['--u', '--w']])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2], ['b.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['b', 'c'], ['--u', '--w']], ['b.ts', ['a', 'c'], ['--v', '--w']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: ['a.ts', 'b.ts']})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, ['b', 'c'], ['--u', '--w']], ['b.ts', 2, ['a', 'c'], ['--v', '--w']]))
})

test('update file no rewrite css', () => {
  const maps = mockMaps(['a.ts', 1, ['a'], ['--v']])
  const summary1 = updateFilesState(
    mockInfo(['a.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', ['a'], ['--v']]),
  )
  assert.deepEqual(summary1, {...baseSummary, updated: ['a.ts'], isRewriteCss: false})
})

test('add one update another move', () => {
  const maps = mockMaps(['a.ts', 1, ['a'], []])
  const summary = updateFilesState(
    mockInfo(['a.ts', 2], ['b.ts', 2]),
    ...maps,
    mockProcessFile(['a.ts', [], ['--v']], ['b.ts', ['a'], []]),
  )
  assert.deepEqual(summary, {...baseSummary, added: ['b.ts'], updated: ['a.ts']})
  assert.deepEqual(maps, mockMaps(['a.ts', 2, [], ['--v']], ['b.ts', 2, ['a'], []]))
})

test('remove one', () => {
  const maps = mockMaps(['a.ts', 1, ['a'], ['--v']])
  const summary = updateFilesState(
    mockInfo(),
    ...maps,
    mockProcessFile(),
  )
  assert.deepEqual(summary, {...baseSummary, removed: ['a.ts']})
  assert.deepEqual(maps, mockMaps())
})

test('move', () => {
  const maps = mockMaps(['a.ts', 1, ['a', 'b'], ['--v', '--u']])
  const summary = updateFilesState(
    mockInfo(['b.ts', 1]),
    ...maps,
    mockProcessFile(['b.ts', ['a', 'b'], ['--v', '--u']]),
  )
  assert.deepEqual(summary, {...baseSummary, added: ['b.ts'], removed: ['a.ts']})
  assert.deepEqual(maps, mockMaps(['b.ts', 1, ['a', 'b'], ['--v', '--u']]))
})

test('remove and move', () => {
  const maps = mockMaps(['a.ts', 1, ['a'], ['--v']], ['b.ts', 1, ['b'], ['--u']])
  const summary = updateFilesState(
    mockInfo(['b.ts', 2]),
    ...maps,
    mockProcessFile(['b.ts', ['b', 'a'], ['--u', '--v']]),
  )
  assert.deepEqual(summary, {...baseSummary, updated: ['b.ts'], removed: ['a.ts']})
  assert.deepEqual(maps, mockMaps(['b.ts', 2, ['b', 'a'], ['--u', '--v']]))
})

test('multiple', () => {
  const maps = mockMaps(
    ['a.ts', 1, ['a'], ['--v']],
    ['b.ts', 1, ['b'], ['--u']],
    ['c.ts', 1, ['c'], ['--v']],
  )
  const summary = updateFilesState(
    mockInfo(['a.ts', 2], ['c.ts', 2], ['d.ts', 1]),
    ...maps,
    mockProcessFile(
      ['a.ts', ['a', 'b'], ['--v', '--u']],
      ['c.ts', ['b'], []],
      ['d.ts', [], ['--w']],
    ),
  )
  assert.deepEqual(summary, {added: ['d.ts'], updated: ['a.ts', 'c.ts'], removed: ['b.ts'], isRewriteCss: true})
  assert.deepEqual(
    maps,
    mockMaps(
      ['a.ts', 2, ['a', 'b'], ['--v', '--u']],
      ['c.ts', 2, ['b'], []],
      ['d.ts', 1, [], ['--w']],
    )
  )
})

// *** Utils ***

function mockMaps(...fileNamesAndVersionsAndClassNames: [fileName: string, version: number, classNames: string[] | undefined, varNames: string[] | undefined][]): [
  filesState: Map<server.NormalizedPath, FileState>,
  classNamesToFileSpans: Map<string, FileSpan[]>,
  varNamesToFileSpans: Map<string, FileSpan[]>,
] {
  const filesState = new Map<server.NormalizedPath, FileState>()
  const classNamesToFileSpans = new Map<string, FileSpan[]>()
  const varNamesToFileSpans = new Map<string, FileSpan[]>()
  for (const [fileName, version, classNames, varNames] of fileNamesAndVersionsAndClassNames) {
    filesState.set(
      fileName as server.NormalizedPath,
      {
        version: String(version),
        classNames: classNames && new Set(classNames),
        varNames: varNames && new Set(varNames),
        css: mockCss(classNames, varNames),
        diagnostics: []
      }
    )
    const addNamesToSpansMap = function(names: string[] | undefined, map: Map<string, FileSpan[]>) {
      if (!names) return
      for (let i = 0; i < names.length; i++) {
        const fileSpans = map.get(names[i]) ?? []
        fileSpans.push({
          fileName: fileName as server.NormalizedPath,
          span: mockSpan(i)
        })
        map.set(names[i], fileSpans)
      }
    }
    addNamesToSpansMap(classNames, classNamesToFileSpans)
    addNamesToSpansMap(varNames, varNamesToFileSpans)
  }

  return [filesState, classNamesToFileSpans, varNamesToFileSpans]
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

function mockProcessFile(...fileNamesAndClassNames: [fileName: string, classNames: string[], varNames: string[]][]): (fileName: server.NormalizedPath) => FileOutput | undefined {
  return fileName => {
    const fileNameAndClassNames = fileNamesAndClassNames.find(([name]) => name === fileName)
    if (!fileNameAndClassNames) return undefined

    const [, classNames, varNames] = fileNameAndClassNames

    function mockNameAndSpans(names: string[]) {
      return names.map((name, index) => ({
        name,
        span: mockSpan(index),
      }))
    }

    return {
      css: mockCss(classNames, varNames),
      classNameAndSpans: mockNameAndSpans(classNames),
      varNameAndSpans: mockNameAndSpans(varNames),
      diagnostics: [],
    }
  }
}

function mockCss(classNames: string[] | undefined, varNames: string[] | undefined) {
  if (!classNames?.length && !varNames?.length) return undefined

  const wr = new BufferWriter()
  wr.write(...classNames ?? [])
  wr.write(...varNames ?? [])
  return wr.finalize()
}

function mockSpan(index: number) {
  return {
    start: {line: 0, character: index},
    end: {line: 0, character: index + 1}
  }
}
