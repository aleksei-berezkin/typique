<script setup lang="ts">
const zClass = ''
import type { Css } from 'typique'
// TODO Describe how it works
const xClass = 'x' satisfies Css<{
  color: 'darkmagenta1'
}>
// TODO maybe "include": "*" as default?
const yClass = 'y' satisfies Css<{}>
</script>

<template>
  <h1 :class=xClass>You did it!!!!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
  </p>
</template>

