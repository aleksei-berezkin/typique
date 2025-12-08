<script lang='ts'>
  import { bgCircleClass, buttonsContainerClass, mainCircleClass, progressPercentVar, r, rejectAnimationClass, rejectDown, strokeWidth, svgClass, viewBox } from './styles'
  let mainSvg: SVGSVGElement
  let circle: SVGCircleElement

  function change(deltaPercent: number) {
    const value = Number(window.getComputedStyle(circle).getPropertyValue(progressPercentVar))
    const newValue = Math.min(Math.max(value + deltaPercent, 0), 100)
    circle.style.setProperty(progressPercentVar, String(newValue))

    if (newValue === value) {
      mainSvg.classList.add(rejectAnimationClass)
      if (!value)
        mainSvg.classList.add(rejectAnimationClass, rejectDown)
    }
  }

  function cleanupAnimation() {
    mainSvg.classList.remove(rejectAnimationClass)
    mainSvg.classList.remove(rejectDown)
  }
</script>

<main>
  <svg class={svgClass} viewBox={viewBox} stroke='currentColor' bind:this={mainSvg} onanimationend={cleanupAnimation}>
    <circle cx={0} cy={0} r={r} fill='none' stroke-width={strokeWidth} bind:this={circle} class={mainCircleClass}  />
    <circle cx={0} cy={0} r={r} fill='none' stroke-width={strokeWidth} class={bgCircleClass}/>
  </svg>
  <div class={buttonsContainerClass}>
    <button onclick={() => change(20)}>🔼</button>
    <button onclick={() => change(-20)}>🔻</button>
  </div>
</main>
