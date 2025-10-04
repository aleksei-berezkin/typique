import { Css } from 'typique'

function App() {
  return (
    <div>
      <span>
        <OtherComponent>
          <span className={ /*~~*/'rr'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,App) skipFixes()) */ satisfies Css<{ color: 'red' }> }>1</span>
          <span>2</span>
        </OtherComponent>
      </span>
    </div>
  )
}

function OtherComponent() {
  return <></>
}

console.log(App)
