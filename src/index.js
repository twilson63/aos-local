import fs from 'fs'
import AoLoader from '@permaweb/ao-loader'
import Async from 'hyper-async'
import { fetchCheckpoint, getCheckpointTx } from './checkpoint.js'
import { pack } from './pack-lua.js'
import weaveDrive from '@permaweb/weavedrive'

const { of, fromPromise } = Async

let WASM64 = {
  format: "wasm64-unknown-emscripten-draft_2024_02_15",
  memoryLimit: "4294967296"
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
    Owner: "OWNER",
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
 * @param {string} aosmodule - module label or txId to wasm binary
 */
export async function aoslocal(aosmodule = LATEST) {
  WASM64 = Object.assign({}, WASM64, {
    WeaveDrive: weaveDrive,
    ARWEAVE: 'https://arweave.net',
    blockHeight: 1000,
    spawn: {
      tags: DEFAULT_ENV.Process.Tags
    },
    module: {
      tags: DEFAULT_ENV.Module.Tags
    }
  })

  // const src = source ? pack(source, 'utf-8') : null

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
  // if (src) {
  //   await of({ expr: src, env: DEFAULT_ENV })
  //     .map(formatEval)
  //     .chain(handle(binary, memory))
  //     .map(updateMemory)
  //     .toPromise()
  // }

  return {
    src: (srcFile) =>
      of(srcFile)
        .map(pack)
        .map(src => ({ expr: src, env: DEFAULT_ENV }))
        .map(formatEval)
        .chain(handle(binary, memory))
        .map(updateMemory)
        .toPromise(),
    load: (pid) => of(pid)
      .chain(fromPromise(getCheckpointTx))
      .chain(fromPromise(fetchCheckpoint))
      .map(m => {
        memory = m
        return true
      })
      .toPromise(),
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
    Id: "MESSAGE_ID",
    Target: ctx.msg?.Target || DEFAULT_ENV.Process.Id,
    Owner: ctx.msg?.Owner || DEFAULT_ENV.Process.Owner,
    Data: ctx.msg?.Data || "",
    Module: "MODULE",
    ["Block-Height"]: "1",
    From: ctx.msg?.From || ctx.msg?.Owner || DEFAULT_ENV.Process.Owner,
    Tags: Object
      .keys(ctx.msg)
      .filter(k => !["Target", "Owner", "Data", "Anchor", "Tags"].includes(k))
      .map(k => ({ name: k, value: ctx.msg[k] }))
  }
  //console.log(aoMsg)
  ctx.msg = aoMsg
  return ctx
}

function handle(binary, mem) {
  return (ctx) => {

    return fromPromise(AoLoader)(binary, WASM64)
      .chain(h => fromPromise(h)(mem, ctx.msg, ctx.env))
  }
}

