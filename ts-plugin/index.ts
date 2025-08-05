import ts from 'typescript/lib/tsserverlibrary'
import { DiagnosticCategory, type Diagnostic } from 'typescript/lib/tsserverlibrary';
import { createLaimPluginState, projectUpdated } from './laimPluginImpl';

function init(modules: { typescript: typeof ts }) {
  // const ts = modules.typescript

  // !! Plugin is created per project. When tsconfig is updated, the project is re-created
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
      // const additional: Diagnostic = {
      //   category: DiagnosticCategory.Warning,
      //   code: 0,
      //   file: info.languageService.getProgram()!!.getSourceFile(fileName),
      //   start: 0,
      //   length: 5 + Math.floor(Math.random() * 10),
      //   messageText: 'Sample error message',
      // }
      return [...prior, /*additional*/]
    }

    const originalUpdateGraph = info.project.updateGraph.bind(info.project);
    info.project.updateGraph = function () {
      const res = originalUpdateGraph.apply(this, arguments as any)

      projectUpdated(laimPluginState)

      // for (const name of info.project.getFileNames()) {
      //   const scriptInfo = info.project.projectService.getScriptInfo(name)
      //   if (scriptInfo?.fileName.endsWith('p1.tsx')) {
      //     const sourceFile = info.project.getSourceFile(scriptInfo.path)
      //     console.log('-= laim scriptInfo.getLatestVersion() = ', scriptInfo.getLatestVersion())
      //   }
      // }
      // console.log('-= laim updated graph =-', updated, 'project.getFileNames().length() = ', info.project.getFileNames().length)

      return res
    }

    // const uniqueProjects = new Set<ts.server.Project>()
    // setInterval(() => {
    //   uniqueProjects.add(info.project)
    //   console.log('uniqueProjects.size=', uniqueProjects.size)
    //   console.log('project.getFileNames().length() = ', info.project.getFileNames().length)
    // }, 5000)

    const uniqueEventNames = new Set<string>()
    const origEvent = info.session!!.event
    info.session!!.event = (body, eventName) => {
      // if (!uniqueEventNames.has(eventName)) {
        // uniqueEventNames.add(eventName)
        // console.log("-=CUSTOM EVENT=-", eventName)
      // }
      origEvent.apply(info.session, [body, eventName])
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
