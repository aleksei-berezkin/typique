import {buttonClass} from './styles.mjs'

entry()

function entry() {
  document.body.innerHTML = [
    Button('Primary'),
    Button('Secondary'),
  ].join('')
}


function Button(text) {
  return `<button class="${buttonClass}">${text}</button>`
}
