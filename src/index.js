import fs from 'fs'
import AoLoader from '@permaweb/ao-loader'
import Async from 'hyper-async'

const { of, fromPromise } = Async

const WASM64 = {
  format: "wasm64-unknown-emscripten-draft_2024_02_15",
}

const DEFAULT_ENV = {
  Process: {
    Id: "TEST_PROCESS_ID",
    Tags: [
      { name: "Data-Protocol", value: "ao" },
      { name: "Variant", value: "ao.TN.1" },
      { name: "Type", value: "Process" },
      { name: "Authority", value: "OWNER" }
    ],
    Owner: "OWNER"
  },
  Module: {
    Id: "TESTING_ID",
    Tags: [
      { name: "Data-Protocol", value: "ao" },
      { name: "Variant", value: "ao.TN.1" },
      { name: "Type", value: "Module" },
    ]
  }
}

// CONSTANTS
export let SQLITE = "sqlite"
export let LLAMA = "llama"
export let LATEST = "module"

/**
 * @param {string} source - filename to source file
 * @param {string} aosmodule - module label or txId to wasm binary
 */
export async function aoslocal(source, aosmodule = LATEST) {

  const src = fs.readFileSync(source, 'utf-8')

  const mod = await fetch('https://raw.githubusercontent.com/permaweb/aos/refs/heads/main/package.json')
    .then(res => res.json())
    .then(result => result.aos[aosmodule] || aosmodule)

  const binary = await fetch('https://arweave.net/' + mod).then(res => res.blob()).then(blob => blob.arrayBuffer())

  // load memory with source
  let memory = null
  let updateMemory = (ctx) => {
    memory = ctx.Memory
    return ctx
  }

  // load src
  await of({ expr: src, env: DEFAULT_ENV })
    .map(formatEval)
    .chain(handle(binary, memory))
    .map(updateMemory)
    .toPromise()

  return {
    eval: (expr, env = DEFAULT_ENV) => of({ expr, env })
      .map(formatEval)
      .chain(handle(binary, memory))
      .map(updateMemory)
      .toPromise()
    ,
    send: (msg, env = DEFAULT_ENV) => of({ msg, env })
      .map(formatAOS)
      .chain(handle(binary, memory))
      .map(updateMemory)
      .toPromise()
  }
}



function formatEval(ctx) {
  ctx.msg = {
    Id: "MESSAGE_ID",
    Target: "TEST_PROCESS_ID",
    Owner: "OWNER",
    Data: ctx.expr,
    Tags: [
      { name: "Action", value: "Eval" }
    ],
    From: "OWNER",
    Timestamp: Date.now().toString(),
    Module: "MODULE",
    ["Block-Height"]: "1"
  }

  return ctx
}

function formatAOS(ctx) {
  const aoMsg = {
    Target: ctx.msg?.Target || DEFAULT_ENV.Process.Id,
    Owner: ctx.msg?.Owner || DEFAULT_ENV.Process.Owner,
    Data: ctx.msg?.Data || "",
    Tags: Object
      .keys(ctx.msg)
      .filter(k => !["Target", "Owner", "Data", "Anchor", "Tags"].includes(k))
      .map(k => ({ name: k, value: ctx.msg[k] }))
  }
  console.log(aoMsg)
  ctx.msg = aoMsg
  return ctx
}

function handle(binary, mem) {
  return (ctx) => {

    return fromPromise(AoLoader)(binary, WASM64)
      .chain(h => fromPromise(h)(mem, ctx.msg, ctx.env))
  }
}

