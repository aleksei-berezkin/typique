import type { Component } from 'solid-js'
import { createEffect, createSignal, For, onCleanup, onMount } from 'solid-js'
import type { Css, Var } from 'typique'

export const rootIdSelector = '#root'

// TODO no 'as const satisfies Var' perhaps because of `;`
// TODO check also the case with '[] satisfies Css<{}>' commented out
const themeVar = {
  accBg: '--theme-acc-bg__f7dWP8Xe',
  accBrdCol: '--theme-acc-brd-col__Nll4g2Ej',
  accShadowCol: '--theme-acc-shadow-col__zSFi1ybS',
  accFgHover: '--theme-acc-fg-hover__1FRE5ghy',
  bg: '--theme-bg__0616zYwr',
  fg: '--theme-fg__0Q7sTYVb',
} as const satisfies Var

[] satisfies Css<{
  'html, body': {
    height: '100%'
    margin: 0
    padding: 0
    width: '100%'
  }
  body: {
    // TODO If type inside ${} is `string`, it's silently ignored
    backgroundColor: `var(${typeof themeVar.bg})`
    color: `var(${typeof themeVar.fg})`
    fontFamily: 'Tahoma, Arial, sans-serif'

    [themeVar.accBg]: '#fff'
    [themeVar.accBrdCol]: '#eee'
    [themeVar.accFgHover]: 'rgba(46, 114, 137, 1)'
    [themeVar.accShadowCol]: 'rgba(0, 0, 0, 0.2)'
    [themeVar.bg]: '#eee'
    [themeVar.fg]: '#000'

    '@media (prefers-color-scheme: dark)': {
      [themeVar.accBg]: '#1a1a1a'
      [themeVar.accBrdCol]: '#333'
      [themeVar.accFgHover]: 'rgba(173, 200, 210, 1)'
      [themeVar.accShadowCol]: '#0008'
      [themeVar.bg]: '#333'
      [themeVar.fg]: '#eee'
    }
  }
  [rootIdSelector]: {
    alignItems: 'start'
    height: '100%'
    display: 'flex'
    justifyContent: 'center'
    width: '100%'
  }
}>

// https://www.blindtextgenerator.com/
const dummyTexts = [
  'Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.',
  'Separated they live in Bookmarksgrove right at the coast of the Semantics, a large language ocean. A small river named Duden flows by their place and supplies it with the necessary regelialia.',
  'It is a paradisematic country, in which roasted parts of sentences fly into your mouth. Even the all-powerful Pointing has no control about the blind texts it is an almost unorthographic life. One day however a small line of blind text by the name of Lorem Ipsum decided to leave for the far World of Grammar.'
]

export const App: Component = () => {
  return <main class={ 'app-main__4LclOM9k' satisfies Css<{
    maxWidth: 'calc(min(600px, 70vw))'
    marginTop: 'calc(min(50px, 6vw))'
  }> }>
    <For each={dummyTexts}>{
      (item, index) => <Item header={`Item ${index() + 1}`} content={item}/>
    }</For>
  </main>
}

const txMs = 225
type PD = '1em'

const Item: Component<{header: string, content: string}> = props => {
  const [open, setOpen] = createSignal(false)

  const [innerVisible, setInnerVisible] = createSignal(false)

  createEffect(() => {
    if (open())
      setInnerVisible(true)
    else
      setTimeout(() => setInnerVisible(open()), txMs)
  })

  const hVar = '--h__NqAtrKnk' satisfies Var

  let wrapperDivRef: HTMLDivElement | undefined
  let innerPRef: HTMLParagraphElement | undefined

  function storeInnerSizeAsVar() {
    wrapperDivRef!.style.setProperty(hVar, `${innerPRef!.offsetHeight}px`)
  }

  onMount(() => {
    storeInnerSizeAsVar()
    window.addEventListener('resize', storeInnerSizeAsVar)
  })

  onCleanup(() => {
    window.removeEventListener('resize', storeInnerSizeAsVar)
  })

  return <div class={ cc(
    'item-div__44nN2zH6' satisfies Css<{
      backgroundColor: `var(${typeof themeVar.accBg})`
      borderTop: `1px solid var(${typeof themeVar.accBrdCol})`
      borderRadius: '4px'
      boxSizing: 'border-box'
      boxShadow: `2px 3px 4px var(${typeof themeVar.accShadowCol})`
      transition: `margin ${typeof txMs}ms`
    }>,
    open() && 'item-div__5lWZxm6s' satisfies Css<{
      '&:not(:first-child)': {
        marginTop: PD
      }
      '&:not(:last-child)': {
        marginBottom: PD
      }
    }>
  ) }>
    <h2 class={ 'item-h2__ckYUP1Jf' satisfies Css<{
      font: 'unset'
      margin: 'unset'
      padding: 'unset',
      '& > button': {
        backgroundColor: 'unset'
        border: 'none'
        color: `unset`
        cursor: 'pointer'
        font: 'unset'
        height: '100%'
        margin: 0,
        padding: PD
        textAlign: 'left'
        width: '100%'
        transition: `color ${typeof txMs}ms, text-shadow ${typeof txMs}ms`
      }
      '& > button:hover': {
        color: `var(${typeof themeVar.accFgHover})`
      }
    }> }>
      <button on:click={ () => setOpen(!open()) }>{props.header}</button>
    </h2>

    <div ref={ wrapperDivRef } class={ cc(
      'item-div__Zu5AgOwS' satisfies Css<{
        height: 0
        overflow: 'hidden'
        transition: `height ${typeof txMs}ms`
      }>,
      open() && 'item-div__PzEyhEju' satisfies Css<{
        height: `var(${typeof hVar})`
      }>,
    ) }>
      <p ref={ innerPRef } class={ cc(
        'item-p__I7Ai6N06' satisfies Css<{
          margin: 0
          opacity: 0
          padding: PD
          paddingTop: `calc(0.5 * ${PD})`
          visibility: 'hidden'
          transition: `opacity ${typeof txMs}ms`
        }>,
        open() && 'item-p__O8we3Z0N' satisfies Css<{
          opacity: '1'
        }>,
        innerVisible() && 'item-p__jWbFTkGT' satisfies Css<{
          visibility: 'visible'
        }>,
      ) }>{
        props.content
      }</p>
    </div>
  </div>
}


/**
 * TODO util
 * Concat classnames
 */
export function cc(...classNames: (undefined | null | string | boolean | number)[]) {
  return classNames.filter(Boolean).join(' ')
}
