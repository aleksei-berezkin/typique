import { $, component$, useSignal } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { Css } from 'typique'

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

export default component$(() => {
  const state = useSignal<'hidden' | 'running' | 'hiding'>('hidden')

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
    setTimeout(() => state.value = 'hidden', onClickTx)
  })

  const handleClick = $(() => {
    if (state.value === 'hidden')
      state.value = 'running'
    else if (state.value === 'running')
      handleAnimationEnd()
  })

  // TODO: info, warning, error
  return <main class={ 'main__oXQ1' satisfies Css<{
    alignItems: 'center'
    display: 'flex'
    height: '100%'
    justifyContent: 'center'
    width: '100%'
  }> } onClick$={ handleClick }>
    <h1 class={ 'h1__AEXj' satisfies Css<{
      color: '#0003'
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
        class={ cc(
          'div__wXif' satisfies Css<{
            animation: `${typeof toastKeyframes} 2s linear forwards`
            backgroundColor: '#000b'
            bottom: 0
            borderRadius: '.25em'
            color: '#eee'
            fontSize: '1em'
            margin: '0 .5em'
            textAlign: 'center'
            padding: '1em'
            position: 'fixed'
          }>,
          state.value === 'hiding' && 'div__kbXO' satisfies Css<{
            backgroundColor: 'transparent'
            bottom: '100vh'
            color: 'transparent'
            transition: `bottom ${typeof onClickTx}ms ease-in,
              background-color ${typeof onClickTx}ms ease-in,
              color ${typeof onClickTx}ms ease-in`
          }>
        ) }
        onAnimationEnd$={ handleAnimationEnd }
      >
        Hi! This is a toast message
      </div>
    }
  </main>
})

/**
 * TODO util
 * Concat classnames
 */
function cc(...classNames: (undefined | null | string | boolean | number)[]) {
  return classNames.filter(Boolean).join(' ')
}
