'use client'

import '../typique-output.css'
import type { Css, Var } from 'typique'
import { useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react'
import { top1000 } from './top1000'
import { co } from './co'

const themeVars = {
  bg: '--theme-bg',
  color: '--theme-color',
  border: '--theme-border',
  borderFocus: '--theme-border-focus',
  hoverBg: '--theme-hover-bg',
  selectedBg: '--theme-selected-bg',
  selectedBrdLeft: '--theme-selected-brd-left',
  selectedBrd: '--theme-selected-brd',
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
      [themeVars.hoverBg]: '#444'
      [themeVars.selectedBg]: '#347'
      [themeVars.selectedBrdLeft]: '#67a'
      [themeVars.selectedBrd]: '#458'
    }
  }

  a: {
    color: '#025bc1'
    textDecoration: 'none'
    '@media (prefers-color-scheme: dark)': {
      color: '#8dbaee'
    }
    '&:hover': {
      textDecoration: 'underline'
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
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])

  function handleInputChange(e: ChangeEvent) {
    doHandleInputChange(e.target as HTMLInputElement)
  }

  function doHandleInputChange(input: HTMLInputElement) {
    setQuery(input.value)
    const _query = input.value.trim().toLowerCase()
    if (!_query) {
      setSearchResults([])
      setCurrentItem(-1)
    } else {
      const newResults = top1000.filter(w => w.startsWith(_query)).slice(0, 10)
      if (searchResults.length !== newResults.length || searchResults.some((w, i) => w !== newResults[i])) {
        setSearchResults(newResults)
        setCurrentItem(-1)
      }
    }
  }

  const [currentItem, setCurrentItem] = useState(-1)
  const [submittedWord, setSubmittedWord] = useState('')
  const [submittedWordPos, setSubmittedWordPos] = useState(-1)

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && searchResults.length) {
      setCurrentItem((currentItem + 1) % searchResults.length)
      e.stopPropagation()
      e.preventDefault()
    } else if (e.key === 'ArrowUp' && searchResults.length) {
      setCurrentItem(
        currentItem <= 0
          ? searchResults.length - 1
          : currentItem - 1
      )
      e.stopPropagation()
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (currentItem !== -1) {
        handleSubmit(searchResults[currentItem])
      } else {
        const _query = query.trim().toLowerCase()
        if (searchResults.includes(_query))
          handleSubmit(_query)
      }
    }
  }

  function handleSubmit(word: string) {
    setQuery('')
    setSearchResults([])
    setSubmittedWord(word)
    setSubmittedWordPos(top1000.indexOf(word) + 1)
  }

  function handleFocus(e: FocusEvent) {
    doHandleInputChange(e.target as HTMLInputElement)
  }

  function handleFocusLost() {
    setSearchResults([])
    setCurrentItem(-1)
  }

  const [ulLeft, setUlLeft] = useState(0)

  return <main className={ 'home-main' satisfies Css<{
    maxWidth: 'calc(min(600px, 70vw))'
    margin: '2em auto auto auto'
  }> }>
    <div
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
      }> }
      onClick={ e =>
        e.currentTarget.querySelector('input')?.focus()
      }
    >
      <MagnifyingGlass />

      <input
        aria-activedescendant=''
        aria-autocomplete='list'
        aria-expanded='false'
        aria-controls='results-list'
        onChange={ handleInputChange }
        onBlur={ handleFocusLost}
        onFocus={ handleFocus }
        onKeyDown={ handleKeyDown }
        placeholder='Search'
        role='combobox'
        type='text'
        value={ query }
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
        ref={ el => {
          if (el && el.parentElement)
            setUlLeft(el.offsetLeft - el.parentElement.offsetLeft)
        } }
      />

    </div>

    <ul
      className={ 'home-ul' satisfies Css<{
        listStyleType: 'none'
        margin: 0
        padding: 0
        paddingTop: '.25em'
      }> }
      style={{
        paddingLeft: `${ulLeft}px`
      }}
    >
      { searchResults.map((w, i) =>
        <SearchListItem
          key={ w }
          word={ w }
          isSelected={ currentItem === i }
          onClick={ () => handleSubmit(w) }
        />
      ) }
    </ul>

    {
      submittedWord && !query &&
      <>
        <h1>{ submittedWord }</h1>
        <p>#{ submittedWordPos } in <a href='https://gist.github.com/deekayen/4148741' target='_blank'>top 1000</a></p>
      </>
    }
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

function SearchListItem({ word, isSelected, onClick }: { word: string, isSelected: boolean, onClick: () => void }) {
  type P = '.2em'
  type B = '.25em'

  return <li
    onClick={ onClick }
    className={ co(
      { isSelected },
      {
        _: 'search-list-item-li',
        isSelected: 'search-list-item-li-is-selected',
      } satisfies Css<{
        borderLeft: `${B} solid transparent`
        boxSizing: 'border-box'
        cursor: 'pointer'
        fontSize: '1.25em'
        marginLeft: `calc(-2 * ${B})`
        padding: `${P} 0 ${P} ${B}`

        '&:hover': {
          backgroundColor: `var(${typeof themeVars.hoverBg})`
        }

        '.$isSelected, .$isSelected:hover': {
          backgroundColor: `var(${typeof themeVars.selectedBg})`
          borderLeftColor: `var(${typeof themeVars.selectedBrdLeft})`
        }
      }>
    ) }
  >{ word }</li>
}
