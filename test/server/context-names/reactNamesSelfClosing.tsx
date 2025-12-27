import type { Css } from 'typique';

function Page() {
  return <input className={ /*~~*/'pp'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,Page/input) skipFixes()) */ satisfies Css<{ color: 'red' }> }/>
}

function Page2() {
  return <div>
    <input className={ /*~~*/'qq'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,Page2/div/input) skipFixes()) */ satisfies Css<{ color: 'red' }> }/>
  </div>
}

console.log(Page, Page2)
