import ts from 'typescript/lib/tsserverlibrary'
import { createTypiquePluginState, getClassNamesCompletions, getCodeFixes, getDiagnostics, log, projectUpdated } from './typiquePlugin';
import { padZeros } from './util';

function init(_modules: { typescript: typeof ts }) {
  function create(info: ts.server.PluginCreateInfo) {
    const started = performance.now()
    const proxy: ts.LanguageService = Object.create(null);

    for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
      const x = info.languageService[k]!
      // @ts-expect-error
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args)
    }

    const typiquePluginState = createTypiquePluginState(info)

    proxy.getSemanticDiagnostics = (fileName) => {
      const prior = info.languageService.getSemanticDiagnostics(fileName)
      const fromPlugin = getDiagnostics(typiquePluginState, fileName)
      return [...prior, ...fromPlugin]
    }

    const originalUpdateGraph = info.project.updateGraph.bind(info.project);
    info.project.updateGraph = function () {
      const res = originalUpdateGraph.apply(this, arguments as any)
      projectUpdated(typiquePluginState)
      return res
    }

    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      const prior = info.languageService.getCompletionsAtPosition(fileName, position, options)
      const classNamesCompletions = getClassNamesCompletions(typiquePluginState, fileName, position)
      if (!classNamesCompletions.length) return prior

      const result = prior
        ?? {
          isGlobalCompletion: false,
          isMemberCompletion: false,
          isNewIdentifierLocation: false,
          entries: [] satisfies ts.CompletionEntry[],
        } satisfies ts.CompletionInfo

      result.entries.push(...classNamesCompletions.map((name, i) => ({
        name,
        sortText: `0${padZeros(i, classNamesCompletions.length - 1)}`,
        kind: ts.ScriptElementKind.string,
        kindModifiers: ts.ScriptElementKindModifier.tsModifier,
      })))

      return result;
    }

    proxy.getCodeFixesAtPosition = (fileName, start, end, errorCodes, formatOptions, preferences) => {
      const prior = info.languageService.getCodeFixesAtPosition(fileName, start, end, errorCodes, formatOptions, preferences)
      const ourFixes = getCodeFixes(typiquePluginState, fileName, start, end)
      return [...prior, ...ourFixes]
    }

    log(info, 'Created', started)

    return proxy
  }

  return { create }
}


export = init
