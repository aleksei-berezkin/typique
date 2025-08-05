import {css, type Css} from 'laim'

declare const unit = 4
declare const keyframesName: 'spin'
declare const keyframesKey: `@keyframes ${typeof keyframesName}`

const [spaced] = css('spaced') satisfies Css<{
  padding: `calc(${typeof unit}px * 2)`
  [keyframesKey]: {
    from: {
      transform: 'rotate(0deg)'
    }
    to: {
      transform: 'rotate(360deg)'
    }
  }
}>

console.log(spaced)
