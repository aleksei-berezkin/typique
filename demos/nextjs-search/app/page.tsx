'use client'

import '../typique-output.css'
import type { Css, Var } from 'typique'
import { cc } from 'typique/util'
import { useState, type KeyboardEvent } from 'react'
import { top1000 } from './top1000'

const themeVars = {
  bg: '--theme-bg',
  searchBg: '--theme-search-bg',
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

    [themeVars.bg]: '#f0f0f0'
    [themeVars.searchBg]: '#fff'
    [themeVars.color]: '#111'
    [themeVars.border]: '#aaa'
    [themeVars.borderFocus]: '#222'
    [themeVars.hoverBg]: '#e6e6e6'
    [themeVars.selectedBg]: 'rgba(220, 226, 245, 1)'
    [themeVars.selectedBrdLeft]: 'rgba(83, 102, 161, 1)'
    [themeVars.selectedBrd]: '#458'

    '@media (prefers-color-scheme: dark)': {
      [themeVars.bg]: '#202020'
      [themeVars.searchBg]: '#111'
      [themeVars.color]: '#f0f0f0'
      [themeVars.border]: '#888'
      [themeVars.borderFocus]: '#ccc'
      [themeVars.hoverBg]: '#444'
      [themeVars.selectedBg]: '#347'
      [themeVars.selectedBrdLeft]: 'rgba(110, 129, 185, 1)'
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
  // TODO using mapped type, without borderColorVarProp
  [borderColorVarProp]: {
    syntax: '"<color>"'
    inherits: true
    initialValue: '#666'
  }
}>

type BrdW = `2px`
type BrdR = `8px`

export default function Home() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [currentItem, setCurrentItem] = useState(-1)

  function handleInputChange(input: HTMLInputElement) {
    setQuery(input.value)
    const _query = input.value.trim().toLowerCase()
    if (!_query) {
      setSearchResults([])
      setCurrentItem(-1)
    } else {
      const currentWord = searchResults[currentItem]
      const newResults = top1000.filter(w => w.startsWith(_query)).slice(0, 10)
      if (searchResults.length !== newResults.length || searchResults.some((w, i) => w !== newResults[i])) {
        setSearchResults(newResults)
        setCurrentItem(currentWord ? newResults.indexOf(currentWord) : -1)
      }
    }
  }

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
      } else if (searchResults.length === 1) {
        handleSubmit(searchResults[0])
      } else {
        const _query = query.trim().toLowerCase()
        if (searchResults.includes(_query))
          handleSubmit(_query)
      }
    }
  }

  const [submittedWord, setSubmittedWord] = useState('')
  const [submittedWordPos, setSubmittedWordPos] = useState(-1)
  function handleSubmit(word: string) {
    setQuery('')
    setSearchResults([])
    setSubmittedWord(word)
    setSubmittedWordPos(top1000.indexOf(word) + 1)
  }

  function handleFocusLost() {
    setSearchResults([])
    setCurrentItem(-1)
  }

  const ariaControlsId = 'results-list'

  return <main className={ 'home-main' satisfies Css<{
    maxWidth: 'calc(min(600px, 70vw))'
    margin: '2em auto auto auto'
  }> }>
    <div
      className={ cc(
        'home-div' satisfies Css<{
          [borderColorVar]: `var(${typeof themeVars.border})`
          '&:focus-within': {
            [borderColorVar]: `var(${typeof themeVars.borderFocus})`
          }

          background: `var(${typeof themeVars.searchBg})`
          border: `${BrdW} solid var(${typeof borderColorVar})`
          borderRadius: BrdR
          display: 'flex'
          paddingLeft: '.2em'
          transition: `${typeof borderColorVar} 200ms`
        }>,

        searchResults.length && 'home-div-0' satisfies Css<{
          // TODO mapped type should work top-level, without &:
          '&': {
            [p in 'borderBottomLeftRadius' | 'borderBottomRightRadius']: 0
          }
        }>

      ) }
      onClick={ e =>
        e.currentTarget.querySelector('input')?.focus()
      }
    >
      <MagnifyingGlass />

      <input
        aria-activedescendant={ wordToId(searchResults[currentItem])}
        aria-autocomplete='list'
        aria-expanded='false'
        aria-controls={ ariaControlsId }
        onChange={ e => handleInputChange(e.target) }
        onFocus={ e => handleInputChange(e.target) }
        onBlur={ handleFocusLost}
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
      />

    </div>

    <ul
      id={ ariaControlsId }
      role='listbox'
      className={ cc(
        'home-ul' satisfies Css<{
          background: `var(${typeof themeVars.searchBg})`
          borderBottomLeftRadius: BrdR
          borderBottomRightRadius: BrdR
          listStyleType: 'none'
          margin: 0
          padding: 0
        }>,
        searchResults.length && 'home-ul-0' satisfies Css<{
          border: `${BrdW} solid var(${typeof themeVars.border})`
          borderTop: 'none'
        }>,
      ) }
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
  type MarkerBrd = '.3em'

  return <li
    aria-selected={ isSelected }
    role='option'
    id={ wordToId(word) }
    onMouseDown={ onClick }
    className={ cc(
      'search-list-item-li' satisfies Css<{
        boxSizing: 'border-box'
        cursor: 'pointer'
        fontSize: '1.25em'

        '&:hover': {
          backgroundColor: `var(${typeof themeVars.hoverBg})`
        }

        '&:not(:last-child)': {
          borderBottom: `${BrdW} solid var(${typeof themeVars.border})`
        }

        '&:last-child': {
          [k in 'borderBottomLeftRadius' | 'borderBottomRightRadius']: BrdR
        }
      }>,
      isSelected && 'search-list-item-li-0' satisfies Css<{
        '&, &:hover': {
          backgroundColor: `var(${typeof themeVars.selectedBg})`
        }
      }>
    ) }
  >
    <div className={ cc(
      'search-list-item-div-0' satisfies Css<{
        borderLeft: `${MarkerBrd} solid transparent`
        padding: '.4em'
        paddingLeft: '.5em'
      }>,
      isSelected && 'search-list-item-div' satisfies Css<{
        borderLeft: `${MarkerBrd} solid var(${typeof themeVars.selectedBrdLeft})`
      }>
    ) }
    >{ word }</div>
  </li>
}

function wordToId(word: string | undefined) {
  return word ? `opt-${word.replace(/[^a-z0-9]/g, '_')}` : undefined
}
