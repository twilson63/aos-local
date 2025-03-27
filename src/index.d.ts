import type { Environment as AoEnvironment, Tag, HandleResponse } from "@permaweb/ao-loader";

export let SQLITE: "sqlite";
export let LLAMA: "llama";
export let LATEST: "module";

export interface Environment extends AoEnvironment {
  Module: {
    Id: string;
    Tags: Tag[];
  }
}

export interface AOSLocal {
  src: (srcFile: string, env?: Environment) => Promise<HandleResponse>;
  load: (pid: string) => Promise<void>;
  eval: (expr: string, env?: Environment) => Promise<HandleResponse>;
  send: (msg: Record<string, string>, env?: Environment) => Promise<HandleResponse>;
}

export function aoslocal(
  aosmodule: "sqlite" | "llama" | "module",
  env?: Environment
): Promise<AOSLocal>;
