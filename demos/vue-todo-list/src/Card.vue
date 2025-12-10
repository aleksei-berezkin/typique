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

const cardClass = 'card' satisfies Css<{
  alignItems: 'center'
  aspectRatio: '2 / 2.5'
  backgroundColor: `var(${typeof themeVars.cardBg})`
  border: '2px solid transparent'
  borderRadius: '4px'
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

const removedCardClass = 'removed-card' satisfies Css<{
  display: 'none'
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

const buttonClass = 'button' satisfies Css<{
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

  '&:focus': {
    borderColor: `var(${typeof themeVars.focusBrd})`
  }

  '&:hover': {
    backgroundColor: `var(${typeof themeVars.btBgHover})`
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
  <li v-else-if="props.kind === 'addButton'" :class="cardClass">
    <button :class="buttonClass" @click="emit('add')">+</button>
  </li>
  <li v-else-if="props.kind === 'empty'" :class="emptyCardClass" />
</template>
