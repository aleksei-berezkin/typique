import { Css } from 'typique'

[] satisfies Css<{
  [p in `@property ${'--x' | '--y'}`]: {
    syntax: '"<length>"'
    inherits: false
  }
}>
