import '../../typique-output.css'

import { $, component$, useSignal } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { Css, Var } from 'typique'
import { co } from './co';

// TODO when: import, import type, export default component$, export const head
// - there was no auto-import

export const head: DocumentHead = {
  title: 'Qwik with Typique Demo',
  meta: [
    {
      name: 'description',
      content: 'Qwik Toast demo with Typique CSS',
    },
  ],
};

[] satisfies Css<{
  'html, body': {
    fontFamily: 'Tahoma, sans-serif'
    height: '100%'
    margin: 0
    padding: 0
    width: '100%'
  }
}>

/* TODO no 'satisfies' completion for
const themeVars = {
  bg: ''
}
*/
const themeVars = {
  bg: '--theme-bg__XHJ9',
  hintColor: '--theme-hint-color__fItM',
  infoBg: '--theme-info-bg__LZtc',
  warningBg: '--theme-warning-bg__RchU',
  errorBg: '--theme-error-bg__MBf6',
  toastColor: '--theme-toast-color__7AOP',
  toastShadowColor: '--theme-toast-shadow-color__j4s2',
} as const satisfies Var

[] satisfies Css<{
  body: {
    backgroundColor: `var(${typeof themeVars.bg})`

    [themeVars.bg]: '#fff'
    [themeVars.hintColor]: '#0003'
    [themeVars.infoBg]: 'rgba(0, 54, 107, 0.95)'
    [themeVars.warningBg]: 'rgba(108, 85, 0, 0.97)'
    [themeVars.errorBg]: 'rgba(170, 0, 51, 0.95)'
    [themeVars.toastColor]: '#fff'
    [themeVars.toastShadowColor]: 'rgba(0, 0, 0, 0.4)'

    '@media (prefers-color-scheme: dark)': {
      [themeVars.bg]: '#333'
      [themeVars.hintColor]: '#fff5'
      [themeVars.infoBg]: 'rgba(185, 220, 255, 1)'
      [themeVars.warningBg]: 'rgba(255, 242, 194, 1)'
      [themeVars.errorBg]: 'rgba(255, 211, 224, 1)'
      [themeVars.toastColor]: '#000'
      [themeVars.toastShadowColor]: 'rgba(0, 0, 0, 0.7)'
    }
  }
}>

const messageTypes = ['info', 'warning', 'error'] as const

export default component$(() => {
  const state = useSignal<'hidden' | 'running' | 'hiding'>('hidden')
  const messageType = useSignal<typeof messageTypes[number]>('info')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toastKeyframes = 'toast-keyframes__noTT' satisfies Css<{
    '@keyframes $0': {
      '0%': {
        animationTimingFunction: 'ease-out'
        opacity: 0
        transform: 'translateY(100%)'
      }
      '8%': {
        animationTimingFunction: 'linear'
        opacity: '1'
        transform: 'translateY(-100%)'
      }
      '100%': {
        animationTimingFunction: 'ease-in'
        transform: 'translateY(-130%)'
      }
    }
  }>

  const onClickTx = 100

  const handleAnimationEnd = $(() => {
    state.value = 'hiding'
    setTimeout(() => {
      state.value = 'hidden'
      const currentMsgTypeIndex = messageTypes.indexOf(messageType.value)
      messageType.value = messageTypes[(currentMsgTypeIndex + 1) % messageTypes.length]
    }, onClickTx)
  })

  const handleClick = $(() => {
    if (state.value === 'hidden')
      state.value = 'running'
    else if (state.value === 'running')
      handleAnimationEnd()
  })

  return <main class={ 'main__oXQ1' satisfies Css<{
    alignItems: 'center'
    display: 'flex'
    height: '100%'
    justifyContent: 'center'
    width: '100%'
  }> } onClick$={ handleClick }>
    <h1 class={ 'h1__AEXj' satisfies Css<{
      color: `var(${typeof themeVars.hintColor})`
      fontSize: '2em'
      fontWeight: 'unset'
      letterSpacing: '.05em'
      textAlign: 'center'
      maxWidth: 'calc(min(600px, 70vw))'
      pointerEvents: 'none'
      userSelect: 'none'
    }> }>Click or tap to see the toast</h1>
    {
      state.value !== 'hidden' && <div
        role='alert'
        class={
          co({
            type: messageType.value,
            hiding: state.value === 'hiding',
          }, {
            _: 'div__8EvJ',
            type: {
              info: 'div-type-info__KjDb',
              warning: 'div-type-warning__5Wef',
              error: 'div-type-error__dQFZ',
            },
            hiding: 'div-hiding__F9l5',
          } satisfies Css<{
            animation: `${typeof toastKeyframes} 2s linear forwards`
            bottom: 0
            borderRadius: '.25em'
            boxShadow: `2px 3px 4px var(${typeof themeVars.toastShadowColor})`
            color: `var(${typeof themeVars.toastColor})`
            fontSize: '1em'
            margin: '0 .5em'
            textAlign: 'center'
            padding: '1em'
            position: 'fixed'
            '.$type$info': {
              backgroundColor: `var(${typeof themeVars.infoBg})`
            }
            '.$type$warning': {
              backgroundColor: `var(${typeof themeVars.warningBg})`
            }
            '.$type$error': {
              backgroundColor: `var(${typeof themeVars.errorBg})`
            }
            '.$hiding': {
              backgroundColor: 'transparent'
              bottom: '100vh'
              color: 'transparent'
              transition: `bottom ${typeof onClickTx}ms ease-in,
                background-color ${typeof onClickTx}ms ease-in,
                color ${typeof onClickTx}ms ease-in`
            }
          }> )
        }
        onAnimationEnd$={ handleAnimationEnd }
      >
        { messageType.value === 'info' ? '✅'
          : messageType.value === 'warning'
          ? '⚠️' : '🚧' } This is a sample {messageType} message
      </div>
    }
  </main>
})
