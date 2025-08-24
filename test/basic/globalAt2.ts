import {type Css} from 'typique'

/**
 * Import is moved to the top because it's the only top-level prop in preprocessed object.
 * Others are objects, or (for margin, padding) are moved into the top-level object.
 */
const cn = 'cls-g-at' satisfies Css<{
  margin: 1
  '@font-face': {
    'font-family': 'Times'
    src: 'localhost'
  }
  '@import \'./other.css\'': null,
  '@import url(./other.css)': null;
  '@namespace svg url(http://www.w3.org/2000/svg)': null;
  '@document url-prefix("https://example.com/blog")': null;
  '@page :first': {
    '@top-left': {
      content: '"Title"';
    }
  }
  padding: 2
}>

console.log(cn)

