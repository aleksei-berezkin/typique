<script setup lang='ts'>
import '../typique-output.css'

import type { Css } from 'typique'
import Card from './Card.vue'
import { ref } from 'vue'

[] satisfies Css<{
  body: {
    fontFamily: 'Arial, sans-serif'
    margin: 0
    padding: 0
  }

  '#id': {
    display: 'content'
  }
}>

type Gap = '1.5em'

const listClass = 'list' satisfies Css<{
  flexDirection: 'row'
  flexWrap: 'wrap'
  display: 'flex'
  gap: Gap
  justifyContent: 'center'
  height: '100%'
  listStyleType: 'none'
  margin: 'auto'
  maxWidth: '700px'
  padding: Gap
}>

let cardIds = ref([0, 1, 2])

function handleAdd() {
  cardIds.value.push((cardIds.value.at(-1) ?? -1) + 1)
  setTimeout(() => {
    const lastTextArea = document.querySelector(`.${listClass}>li:nth-last-child(4) textarea`);
    (lastTextArea as HTMLTextAreaElement).focus()
  })
}

</script>

<template>
  <ul :class=listClass>
    <Card v-for="cardId in cardIds" kind="normal" :key="cardId" :card-id="cardId"/>
    <Card kind="addButton" :cardId="-3" @add="handleAdd"/>
    <Card kind="empty" :cardId="-2" />
    <Card kind="empty" :cardId="-1" />
  </ul>
</template>

