import { type Css, css } from 'laim'

const [cn] = css('fallbacks') satisfies Css<{
  color: ['red', 'oklch(100% 0 0)'],
  '&:active': {
    color: ['magenta', 'oklch(80% 0 0)']
    '@media (max-width: 600px)': {
      color: ['magenta', 'oklch(50% 0 0)']
    }
  }
  width: ['100px', '-vendor-100-percent'],
}>

console.log(cn)