import { Css } from 'typique'

function App() {
  return (
    <div>
      <div>
        <OtherComponent>
          <span className={ /*~~*/'rr'/*~~ doesNotSatisfy(contextNameEvaluatedTo(,,App/div/div/OtherComponent/span) skipFixes()) */ satisfies Css<{ color: 'red' }> }>1</span>
          <span>2</span>
        </OtherComponent>
      </div>
    </div>
  )
}

function OtherComponent() {
  return <></>
}

console.log(App)
