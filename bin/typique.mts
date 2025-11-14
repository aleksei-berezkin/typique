#!/usr/bin/env node

import { parseCmd } from './parseCmd.mjs';

const {projectFile, tsserver, tsArgs} = parseCmd(process.argv)

const tsserverExec = tsserver ?? import.meta.resolve('typescript/lib/tsserver.js')

console.log(projectFile, tsserverExec, tsArgs)
