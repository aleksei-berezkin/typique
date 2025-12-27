import {type Css} from 'typique'

export function MyComponent() {
  const myClass = 'my' satisfies Css<{
    color: 'red'
  }>

  return `<div class="${myClass}"></div>`
}

export function MyComponent1() {
  return `<span class="${
    'my-0' satisfies Css<{
      color: 'blue'
    }>
  }"></span>`
}

export function MyComponent2() {
  for (const _ of [0, 1, 2]) {
    const myClass = 'my-1' satisfies Css<{
      color: 'magenta'
    }>
    return `<div class="${myClass}"></div>`
  }
}
