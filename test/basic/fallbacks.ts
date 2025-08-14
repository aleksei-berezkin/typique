import { type Css } from 'laim'

const cn = 'fallbacks' satisfies Css<{
  color: ['red', 'oklch(100% 0 0)'],
  '&:active': {
    color: ['magenta', 'oklch(80% 0 0)']
    '@media (max-width: 600px)': {
      color: ['magenta', 'oklch(50% 0 0)']
    }
  }
  '-vendor-prop': ['-vendor-val', 0, false],
}>

console.log(cn)