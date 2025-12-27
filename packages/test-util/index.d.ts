export declare function runInDir(dir: string, filter: (fileBasename: string) => boolean): Promise<unknown>
export declare function suite(name: string, suiteCb: (suiteHandle: SuiteHandle) => Promise<unknown> | void): Promise<unknown>
export type SuiteHandle = {
  test: typeof test
}

export declare function test(name: string, cb: () => Promise<unknown> | void): Promise<unknown>
