import { test } from 'test-util'
import assert from 'node:assert'
import type { server } from 'typescript/lib/tsserverlibrary'
import { updateFilesState, type FileOutput, type FileState, type FileSpan, type TypiquePluginState } from './typiquePlugin'
import { BufferWriter } from './BufferWriter'

const baseSummary = {
  added: [],
  updated: [],
  removed: [],
  isRewriteCss: true,
}

type NP = server.NormalizedPath

test('test maps', () => {
  const [filesState, names] = mockMaps(
    ['a.ts', 1, ['a', 'b'], ['--v']],
    ['b.ts', 2, ['b', 'c', 'd'], undefined],
    ['c.ts', 1, [], ['--v', '--u']],
    ['d.ts', 0, undefined, []],
  )

  assert.deepStrictEqual([...filesState.keys()], ['a.ts', 'b.ts', 'c.ts', 'd.ts'])
  assert.deepStrictEqual(
    filesState.get('a.ts' as NP),
    {
      version: '1',
      names: {
        class: [
          {name: {inSrc: 'a${""}', evaluated: 'a'}, span: mockSpan(0)},
          {name: {inSrc: 'b${""}', evaluated: 'b'}, span: mockSpan(1)},
        ],
        var: [
          {name: {inSrc: '--v${""}', evaluated: '--v'}, span: mockSpan(0)},
        ]
      },
      diagnostics: [],
      css: mockCss(['a', 'b'], ['--v']),
    }
  )
  assert.deepStrictEqual(
    filesState.get('b.ts' as NP),
    {
      version: '2',
      names: {
        class: [
          {name: {inSrc: 'b${""}', evaluated: 'b'}, span: mockSpan(0)},
          {name: {inSrc: 'c${""}', evaluated: 'c'}, span: mockSpan(1)},
          {name: {inSrc: 'd${""}', evaluated: 'd'}, span: mockSpan(2)},
        ],
        var: [],
      },
      diagnostics: [],
      css: mockCss(['b', 'c', 'd'], []),
    }
  )
  assert.deepStrictEqual(
    filesState.get('c.ts' as NP),
    {
      version: '1',
      names: {
        class: [],
        var: [
          {name: {inSrc: '--v${""}', evaluated: '--v'}, span: mockSpan(0)},
          {name: {inSrc: '--u${""}', evaluated: '--u'}, span: mockSpan(1)},
        ],
      },
      diagnostics: [],
      css: mockCss([], ['--v', '--u']),
    }
  )
  assert.deepStrictEqual(
    filesState.get('d.ts' as NP),
    {
      version: '0',
      names: {
        class: [],
        var: [],
      },
      diagnostics: [],
      css: undefined,
    }
  )

  assert.deepStrictEqual([...names.class.inSrc.keys()], ['a${""}', 'b${""}', 'c${""}', 'd${""}'])
  assert.deepStrictEqual([...names.class.evaluated.keys()], ['a', 'b', 'c', 'd'])

  function assertName(
    maps: {inSrc: Map<string, FileSpan[]>, evaluated: Map<string, FileSpan[]>},
    name: string,
    spans: FileSpan[]
  ) {
    assert.deepStrictEqual(maps.inSrc.get(name + '${""}'), spans)
    assert.deepStrictEqual(maps.evaluated.get(name), spans)
  }

  assertName(names.class, 'a', [{fileName: 'a.ts' as NP, span: mockSpan(0)}])
  assertName(names.class, 'b', [
    {fileName: 'a.ts' as NP, span: mockSpan(1)},
    {fileName: 'b.ts' as NP, span: mockSpan(0)},
  ])
  assertName(names.class, 'c', [{fileName: 'b.ts' as NP, span: mockSpan(1)}])
  assertName(names.class, 'd', [{fileName: 'b.ts' as NP, span: mockSpan(2)}])

  assert.deepStrictEqual([...names.var.inSrc.keys()], ['--v${""}', '--u${""}'])
  assert.deepStrictEqual([...names.var.evaluated.keys()], ['--v', '--u'])

  assertName(names.var, '--v', [
    {fileName: 'a.ts' as NP, span: mockSpan(0)},
    {fileName: 'c.ts' as NP, span: mockSpan(0)},
  ])
  assertName(names.var, '--u', [{fileName: 'c.ts' as NP, span: mockSpan(1)}])
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

  assert.deepEqual(maps, mockMaps(['a.ts', 1, undefined, undefined]))
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
  names: TypiquePluginState['names'],
] {
  const filesState = new Map<server.NormalizedPath, FileState>()
  const names: TypiquePluginState['names'] = {
    class: {
      inSrc: new Map(),
      evaluated: new Map(),
    },
    var: {
      inSrc: new Map(),
      evaluated: new Map(),
    },
  }
  for (const [fileName, version, classNames, varNames] of fileNamesAndVersionsAndClassNames) {
    filesState.set(
      fileName as NP,
      {
        version: String(version),
        names: classNames || varNames ? {
          class: (classNames ?? []).map((cn, i) => ({
            name: {
              inSrc: cn + '${""}',
              evaluated: cn,
            },
            span: mockSpan(i),
          })),
          var: (varNames ?? []).map((vn, i) => ({
            name: {
              inSrc: vn + '${""}',
              evaluated: vn,
            }, span: mockSpan(i),
          }))
        } : undefined,
        css: mockCss(classNames, varNames),
        diagnostics: []
      }
    )
    const addNamesToSpansMap = function(_names: string[] | undefined, maps: typeof names.class | typeof names.var) {
      if (!_names) return
      for (let i = 0; i < _names.length; i++) {
        const span = mockSpan(i)

        const inSrcSpans = maps.inSrc.get(_names[i] + '${""}') ?? []
        inSrcSpans.push({fileName: fileName as NP, span})
        maps.inSrc.set(_names[i] + '${""}', inSrcSpans)

        const evaluatedSpans = maps.evaluated.get(_names[i]) ?? []
        evaluatedSpans.push({fileName: fileName as NP, span})
        maps.evaluated.set(_names[i], evaluatedSpans)
      }
    }
    addNamesToSpansMap(classNames, names.class)
    addNamesToSpansMap(varNames, names.var)
  }

  return [filesState, names]
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
        name: {
          inSrc: name + '${""}',
          evaluated: name
        },
        span: mockSpan(index),
      }))
    }

    return {
      css: mockCss(classNames, varNames),
      names: {
        class: mockNameAndSpans(classNames),
        var: mockNameAndSpans(varNames),
      },
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
