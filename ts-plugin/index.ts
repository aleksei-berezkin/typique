import ts from 'typescript/lib/tsserverlibrary'
import { createLaimPluginState, getDiagnostics, projectUpdated } from './laimPluginImpl';

function init(_modules: { typescript: typeof ts }) {
  function create(info: ts.server.PluginCreateInfo) {
    const proxy: ts.LanguageService = Object.create(null);

    for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
      const x = info.languageService[k]!
      // @ts-expect-error
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args)
    }

    const laimPluginState = createLaimPluginState(info)

    proxy.getSemanticDiagnostics = (fileName) => {
      const prior = info.languageService.getSemanticDiagnostics(fileName)
      const fromPlugin = getDiagnostics(laimPluginState, fileName)
      return [...prior, ...fromPlugin]
    }

    const originalUpdateGraph = info.project.updateGraph.bind(info.project);
    info.project.updateGraph = function () {
      const res = originalUpdateGraph.apply(this, arguments as any)
      projectUpdated(laimPluginState)
      return res
    }

    // lsProxy.getCompletionsAtPosition = (fileName, position, options) => {
    //   const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);
    //   prior.entries = prior.entries.filter(e => e.name !== "caller");
    //   return prior;
    // }

    info.project.projectService.logger.info('Laim Plugin created')

    return proxy
  }

  return { create }
}


export = init
