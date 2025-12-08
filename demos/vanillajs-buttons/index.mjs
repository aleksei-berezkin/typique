import {buttonClass, hoverXVar, hoverYVar, primaryClass, secondaryClass, primaryOutlinedClass, secondaryOutlinedClass} from './styles.mjs'

document.body.innerHTML = 
  `<button class="${buttonClass} ${primaryClass}">Primary</button>
  <button class="${buttonClass} ${secondaryClass}">Secondary</button>
  <button class="${buttonClass} ${primaryOutlinedClass}">Primary outlined</button>
  <button class="${buttonClass} ${secondaryOutlinedClass}">Secondary outlined</button>`

document.body.querySelectorAll(`.${buttonClass}`).forEach(button =>
  button.addEventListener('mousemove', e => {
    e.currentTarget.style.setProperty(hoverXVar, `${e.offsetX}px`)
    e.currentTarget.style.setProperty(hoverYVar, `${e.offsetY}px`)
  })
)
