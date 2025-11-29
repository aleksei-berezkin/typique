import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { Css } from 'typique'

// TODO when: import, import type, export default component$, export const head
// - there was no auto-import

export const head: DocumentHead = {
  title: "Qwik with Typique Demo",
  meta: [
    {
      name: "description",
      content: "Qwik Toast demo with Typique CSS",
    },
  ],
}

export default component$(() => {
  return (
    <>
      <h1 class={ 'h1__AEXj' satisfies Css<{
        color: 'darkmagenta'
      }> }>Hi!! 👋</h1>
      <div>
        Can't wait to see what you build with qwik!
        <br />
        Happy coding.
      </div>
    </>
  );
})

