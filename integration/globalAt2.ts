import {css, type Css} from 'laim'

/**
 * Import is moved to the top because it's the only top-level prop in preprocessed object.
 * Others are objects, or (for margin, padding) are moved into the top-level object.
 */
const [cn] = css('cls-g') satisfies Css<{
  margin: 1
  '@font-face': {
    'font-family': 'Times'
    src: 'localhost'
  }
  '@import url(other)': null,
  // TODO `.ext` is misinterpreted as a classname -- escape url() and quotes
  // @import url(other.css);
  // @namespace svg url(http://www.w3.org/2000/svg);
  // @document url-prefix("https://example.com/blog")
  '@page :first': {
    '@top-left': {
      content: '"Title"';
    }
  }
  padding: 2
}>

console.log(cn)

