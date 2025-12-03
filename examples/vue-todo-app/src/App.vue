<script setup lang='ts'>
import '../typique-output.css'

import type { Css, Var } from 'typique'
import Card from './Card.vue'

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

const mainClass = 'main' satisfies Css<{
  flexDirection: 'row'
  flexWrap: 'wrap'
  display: 'flex'
  gap: Gap
  justifyContent: 'center'
  height: '100%'
  margin: 'auto'
  maxWidth: '700px'
  padding: Gap
}>

// TODO maybe "include": "*" as default?
</script>

<template>
  <main :class=mainClass>
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card :empty='true' />
    <Card :empty='true' />
  </main>
</template>

