/**
 * Where possible, we piggypack on existing codes for which TS provides quickfixes,
 * because VS Code requests and caches `getSupportedCodeFixes` in the beginning
 * without the file argument, so the plugin is not even queried.
 */
export const errorCodeAndMsg = {
  // doesNotSatisfy: (className: string, pattern: string) => ({
  //   code: 1360,
  //   // Orig: Type '{0}' does not satisfy the expected type '{1}'.
  //   message: `Class name '${className}' does not satisfy the pattern '${pattern}'.`,
  // }),
  duplicate: (name: string) => ({
    code: 2300, 
    // Orig: Duplicate identifier '{0}'.
    messageText: `Duplicate class name '${name}'.`,
  }),
  cannotFind: (name: string) => ({
    code: 2304,
    // Same as orig
    messageText: `Cannot find name '${name}'.`,
  }),
  propertyDoesNotExistOnType: (name: string, type: string) => ({
    code: 2339,
    // Same as orig
    messageText: `Property '${name}' does not exist on type '${type}'.`,
  }),
  doesNotSatisfy: (className: string, pattern: string) => ({
    code: 2344,
    // Orig: Type '{0}' does not satisfy the constraint '{1}'.
    messageText: `Class name '${className}' does not satisfy the pattern '${pattern}'.`,
  }),
  tupleHasNoElement: (tupleType: string, length: number | string, index: number | string) => ({
    // TODO this message is unused
    code: 2493,
    // Orig: Tuple type '{0}' of length '{1}' has no element at index '{2}'.
    messageText: `Tuple type '${tupleType}' of length '${length}' has no element at index '${index}'.`,
  }),
  alsoDeclared: (name: string) => ({
    code: 6203,
    // Same as orig
    messageText: `'${name}' was also declared here.`,
  }),
  satisfiesLhsUnexpected: {
    code: 0,
    messageText: 'Expected: string literal or array literal of strings.',
  },
  unused: {
    code: 0,
    messageText: 'Unused class name.',
  },
}

export const actionDescriptionAndName = {
  change: (name: string, newName: string) => ({
    description: `Change '${name}' to '${newName}'`,
    fixName: 'typique-change',
  }),
}
