type ClassesObject<Props> = {
  _?: string
} & {
  [K in keyof Props]?: PropToClasses<Props[K]>
}

type PropToClasses<Val> = Val extends string ? { [k in Val]?: string }
  : Val extends number ? { [k in Val]?: string }
  : Val extends boolean ? string | { true?: string, false?: string }
  : never

/**
 * Concatenate classnames from object
 */
export function co<Props extends Record<string, unknown>>(props: Props, classesObject: ClassesObject<Props>): string {
  function selectClass(classesKey: string) {
    const classesVal = classesObject[classesKey]
    if (!classesVal)
      return

    if (classesKey === '_')
      return classesVal

    const propsVal = props[classesKey]
    if (typeof classesVal === 'object' && (typeof propsVal === 'string' || typeof propsVal === 'number'))
      return (classesVal as Record<string | number, string>)[propsVal]

    // boolean
    if (typeof classesVal === 'string' && propsVal)
      return classesVal

    if (typeof classesVal === 'object')
      return (classesVal as Record<'true' | 'false', string>)[propsVal ? 'true' : 'false']
  }

  return Object.keys(classesObject)
    .map(selectClass)
    .filter(c => c && typeof c === 'string')
    .join(' ')
}
