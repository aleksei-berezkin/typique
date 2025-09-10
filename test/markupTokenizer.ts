import assert from 'node:assert'

type State = 
  | { name: 'default' }
  | { name: 'string', text: string }
  | { name: 'escape', text: string }
  | { name: 'id', text: string }
  | { name: 'number', text: string }

export function* tokenize(input: string): IterableIterator<string> {
  let state: State = { name: 'default' }

  for (const c of input) {
    function* handleDefault() {
      if (c === '\'')
        state = { name: 'string', text: '' }
      else if (c.match(/[a-zA-Z]/))
        state = { name: 'id', text: c }
      else if (c.match(/[0-9]/))
        state = { name: 'number', text: c }
      else {
        state = { name: 'default' }
        if (c.trim()) yield c
      }
    }

    if (state.name === 'default') {
      yield* handleDefault()
    } else if (state.name === 'string') {
      if (c === '\'') {
        yield state.text
        state = { name: 'default' }
      }
      else if (c === '\\')
        state = { name: 'escape', text: state.text }
      else
        state = { name: 'string', text: state.text + c }
    } else if (state.name === 'escape') {
      state = { name: 'string', text: state.text + c }
    } else if (state.name === 'id') {
      if (c.match(/[a-zA-Z0-9-]/))
        state = { name: 'id', text: state.text + c }
      else {
        yield state.text
        yield* handleDefault()
      }
    } else if (state.name === 'number') {
      if (c.match(/[0-9]/))
        state = { name: 'number', text: state.text + c }
      else {
        yield state.text
        yield* handleDefault()
      }
    }
  }

  if (state.name === 'string' || state.name === 'escape')
    throw new Error('Unterminated string')

  if (state.name === 'id' || state.name === 'number')
    yield state.text
}
