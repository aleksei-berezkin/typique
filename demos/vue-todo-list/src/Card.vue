<script setup lang='ts'>
import type { Css } from 'typique'
import type { themeVars } from './theme'
import { ref, useTemplateRef } from 'vue';

const emit = defineEmits<{
  (e: 'add'): void
}>()

const props = defineProps<{
  cardId: number
  kind: 'normal' | 'addButton' | 'empty'
}>()

type Width = 'calc(min(200px, max(35vw, 140px)))'

type R = '4px'

const [cardClass, noPadding] = ['card', 'no-padding'] satisfies Css<{
  alignItems: 'center'
  aspectRatio: '2 / 2.5'
  backgroundColor: `var(${typeof themeVars.cardBg})`
  border: '2px solid transparent'
  borderRadius: R
  boxSizing: 'border-box'
  display: 'flex'
  flexDirection: 'column'
  justifyContent: 'center'
  padding: '0.75em'
  transition: 'border-color 150ms'
  width: Width

  '&:has(textarea:focus)': {
    borderColor: `var(${typeof themeVars.focusBrd})`
  }

  '.$1': {
    border: 'none'
    padding: 0
  }
}>

const [cardTextClass, doneClass] = ['card-text', 'done'] as const satisfies Css<{
  color: `var(${typeof themeVars.color})`
  flexGrow: '1'
  fontSize: 16
  padding: 0
  width: '100%'

  'textarea&': {
    background: 'unset'
    border: 'none'
    boxSizing: 'border-box'
    fontFamily: 'unset'
    outline: 'none'
    resize: 'none'

    '&.$1': {
      color: `var(${typeof themeVars.cardDoneColor})`
      textDecoration: 'line-through'
    }
  }
}>

const emptyCardClass = 'empty-card' satisfies Css<{
  height: 0
  width: Width
}>

// TODO not every edit causes re-generating styles
// Test: change other file
const buttonsGroupClass = 'buttons-group' satisfies Css<{
  flexGrow: '0'

  '&>button:not(:last-child)': {
    marginRight: '1em'
  }
}>

const [buttonClass, addButton] = ['button', 'add-button-0'] satisfies Css<{
  cursor: 'pointer'
  color: 'unset'
  backgroundColor: `var(${typeof themeVars.btBg})`
  border: '2px solid transparent'
  borderRadius: '50%'
  boxSizing: 'border-box'
  fontSize: 18
  height: '2em'
  margin: 0
  outline: 'none'
  transition: 'background-color 150ms'
  width: '2em'

  '.$1': {
    backgroundColor: 'unset'
    borderRadius: R
    color: `var(${typeof themeVars.addBtColor})`
    fontSize: '3.5em'
    height: '100%'
    width: '100%'
  }

  '&:focus': {
    borderColor: `var(${typeof themeVars.focusBrd})`
  }

  '&:hover': {
    backgroundColor: `var(${typeof themeVars.btBgHover})`
  }

  '.$1:hover': {
    backgroundColor: `var(${typeof themeVars.addBtHover})`
  }
}>

const done = ref(false)
const input = useTemplateRef('input')

function handleDoneClick() {
  done.value = !done.value
  if (done.value)
    input.value?.classList.add(doneClass)
  else
    input.value?.classList.remove(doneClass)
}

const removed = ref(false)
function handleRemoveClick() {
  removed.value = true
}

</script>

<template>
  <li v-if="props.kind === 'normal' && !removed" :class="cardClass">
    <textarea :class="cardTextClass" placeholder="What is the task?" ref="input" />

    <div :class="buttonsGroupClass">
      <button :class="buttonClass" @:click="handleDoneClick">{{ done ? '↩️' : '✅' }}</button>
      <button :class="buttonClass" @:click="handleRemoveClick">❌</button>
    </div>
  </li>
  <li v-else-if="props.kind === 'addButton'" :class="`${cardClass} ${noPadding}`">
    <button :class="`${buttonClass} ${addButton}`" @click="emit('add')">+</button>
  </li>
  <li v-else-if="props.kind === 'empty'" :class="emptyCardClass" />
</template>
