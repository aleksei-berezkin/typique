<script setup lang="ts">
import type { Css } from 'typique'
// TODO it works via https://github.com/vuejs/language-tools/blob/master/packages/typescript-plugin/
// TODO debug, write test
const xClass = 'x' satisfies Css<{
  color: 'red'
}>
</script>

<template>
  <h1>You did it!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
  </p>
</template>

<style scoped></style>
