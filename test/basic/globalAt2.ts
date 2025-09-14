import {type Css} from 'typique'

/**
 * Import is moved to the top because it's the only top-level prop in preprocessed object.
 * Others are objects, or (for margin, padding) are moved into the top-level object.
 */
const clsG_at = 'cls-g-at' satisfies Css<{
  margin: 1
  '@font-face': {
    'font-family': 'Times'
    src: 'localhost'
  }
  '@import \'./other$0.css\'': null,
  '@import url(./other.$1.css)': null;
  '@namespace svg url(http://www.w3.org/2000/svg.$0)': null;
  '@document url-prefix("https://example.$1.com/blog")': null;
  '@page :first': {
    '@top-left': {
      content: '"Title.$0"';
    }
  }
  padding: 2
}>

console.log(clsG_at)

