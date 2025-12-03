<script setup lang='ts'>
import type { Css } from 'typique'
import type { themeVars } from './theme'

const props = defineProps<{
  empty?: boolean
}>()

type Width = 'calc(min(200px, max(35vw, 140px)))'

const cardClass = 'card' satisfies Css<{
  aspectRatio: '2 / 2.5'
  backgroundColor: `var(${typeof themeVars.cardBg})`
  border: '2px solid transparent'
  borderRadius: '4px'
  boxSizing: 'border-box'
  display: 'flex'
  flexDirection: 'column'
  alignItems: 'center'
  padding: '0.5em'
  transition: 'border-color 150ms'
  width: Width

  '&:focus-within': {
    borderColor: `var(${typeof themeVars.cardFocusBrd})`
  }

  '& textarea': {
    background: 'unset'
    border: 'none'
    boxSizing: 'border-box'
    color: `var(${typeof themeVars.color})`
    flexGrow: '1'
    outline: 'none'
    resize: 'none'
    width: '100%'
  }
}>

const emptyCardClass = 'empty-card' satisfies Css<{
  height: 0
  width: Width
}>

const buttonsGroupClass = 'buttons-group' satisfies Css<{
  flexGrow: '0'

  '& > button:not(:last-child)': {
    marginRight: '1em'
  }
}>

</script>

<template>
  <div :class='props.empty ? emptyCardClass : cardClass'>
    <textarea v-if='!props.empty' placeholder='What is the task?' />
    <div v-if='!props.empty' :class='buttonsGroupClass'>
      <button>✅</button>
      <button>❌</button>
    </div>
  </div>
</template>
