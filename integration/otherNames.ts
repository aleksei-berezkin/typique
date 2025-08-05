import {css, type Css} from 'laim'

/*
 * The layer below is in fact nested to the root class, while keyframes are not.
 * The preprocessed object looks like this:
 * {
 *   .btn-0: {
 *     animation: ...
 *     @layer btn-2: {
 *       & { color: red }
 *     }
 *   }
 *   @keyframes btn-1 { ... }
 * }
 * 
 * That is why the layer is output before the keyframes.
 * However, names are rewritten in the same order as in the original object.
 */
const [btn,, layerBase] = css('btn') satisfies Css<{
  animation: `%%fadeIn 0.3s ease-in-out`
  '@keyframes %%fadeIn': {
    from: {
      opacity: 0
    }
    to: {
      opacity: 1
    }
  }
  '@layer %%base': {
    color: 'red'
  }
}>

console.log(btn, layerBase)
