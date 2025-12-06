'use client'

import '../typique-output.css'
import type { Css, Var } from 'typique'
import type { MouseEvent } from 'react'

const themeVars = {
  bg: '--theme-bg',
  color: '--theme-color',
  border: '--theme-border',
  borderFocus: '--theme-border-focus',
} as const satisfies Var

[] satisfies Css<{
  body: {
    background: `var(${typeof themeVars.bg})`
    color: `var(${typeof themeVars.color})`
    fontFamily: 'Arial, sans-serif'
    margin: 0
    padding: 0

    [themeVars.bg]: '#eee'
    [themeVars.color]: '#111'
    [themeVars.border]: '#0006'

    '@media (prefers-color-scheme: dark)': {
      [themeVars.bg]: '#333'
      [themeVars.color]: '#eee'
      [themeVars.border]: '#fff6'
      [themeVars.borderFocus]: '#fffb'
    }
  }
}>

const borderColorVar = '--border-color' satisfies Var;
declare const borderColorVarProp: `@property ${typeof borderColorVar}`

[] satisfies Css<{
  [borderColorVarProp]: {
    syntax: '"<color>"'
    inherits: true
    initialValue: '#666'
  }
}>

export default function Home() {
  function handleClick(e: MouseEvent) {
    const divContainer = e.currentTarget as HTMLDivElement
    divContainer.querySelector('input')?.focus()
  }

  return <main className={ 'home-main' satisfies Css<{
    maxWidth: 'calc(min(600px, 70vw))'
    margin: '2em auto auto auto'
  }> }>
    <div
      onClick={ handleClick }
      className={ 'home-div' satisfies Css<{
        [borderColorVar]: `var(${typeof themeVars.border})`
        '&:focus-within': {
          [borderColorVar]: `var(${typeof themeVars.borderFocus})`
        }

        border: `2px solid var(${typeof borderColorVar})`
        borderRadius: '100px'
        display: 'flex'
        paddingLeft: '.2em'
        transition: `${typeof borderColorVar} 200ms`
      }>
    }>
      <MagnifyingGlass />
      <input
        aria-activedescendant=''
        aria-autocomplete='list'
        aria-expanded='false'
        aria-controls='results-list'
        placeholder='Search'
        role='combobox'
        type='text'
        className={ 'home-input' satisfies Css<{
          background: 'unset'
          border: 'none'
          boxSizing: 'border-box'
          color: 'unset'
          fontSize: '1.5em'
          flexGrow: '1'
          outline: 'none'
          width: '100%'
        }> }
      />
    </div>
  </main>
}

function MagnifyingGlass() {
  // License: CC Attribution. Made by geakstr: https://github.com/geakstr/entypo-icons
  return <svg width='40px' height='40px' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg' className={ 'magnifying-glass-svg' satisfies Css<{
    stroke: 'none'
    fill: `var(${typeof borderColorVar})`
    transform: 'scale(.75)'
  }>}>
    <path d='m35.09 30.934 -7.558 -7.558a12.3 12.3 0 0 0 1.796 -6.42c0 -6.834 -5.922 -12.754 -12.756 -12.754A12.37 12.37 0 0 0 4.2 16.574c0 6.832 5.922 12.754 12.754 12.754a12.3 12.3 0 0 0 6.23 -1.688l7.598 7.602a1.906 1.906 0 0 0 2.692 0l1.886 -1.886c0.742 -0.742 0.472 -1.68 -0.27 -2.422M8.008 16.574a8.56 8.56 0 0 1 8.564 -8.566c4.732 0 8.948 4.214 8.948 8.948a8.568 8.568 0 0 1 -8.566 8.566c-4.732 -0.002 -8.946 -4.218 -8.946 -8.948'/>
  </svg>
}
