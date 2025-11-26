import type { Component } from 'solid-js';
import Comp from './Comp';
import type { Css } from 'typique'

const App: Component = () => {
  return (
    <>
      <h1 class={ 'app-h1' satisfies Css<{
        color: 'fuchsia'
      }> }>Hello world!!!!</h1>
      <Comp />
    </>
  );
};

export default App;
