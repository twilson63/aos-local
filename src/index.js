import fs from 'fs'
import AoLoader from '@permaweb/ao-loader'
import Async from 'hyper-async'
import { fetchCheckpoint, getCheckpointTx, fetchState } from './checkpoint.js'
import { pack } from './pack-lua.js'
import weaveDrive from '@permaweb/weavedrive'
import { loadEnv } from './load-env.js'
import { mergeDeepRight } from 'ramda'

const { of, fromPromise } = Async

let WASM64 = {
  format: "wasm64-unknown-emscripten-draft_2024_02_15",
  memoryLimit: "17179869184"
}

let DEFAULT_ENV = {
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

let aosHandle = null

/**
 * @param {string} aosmodule - module label or txId to wasm binary
 */
export async function aoslocal(aosmodule = LATEST, env) {
  WASM64 = Object.assign({}, WASM64, {
    WeaveDrive: weaveDrive,
    ARWEAVE: 'https://arweave.net',
    blockHeight: 1000,
    spawn: {
      tags: env?.Process?.Tags ?? DEFAULT_ENV.Process.Tags
    },
    module: {
      tags: env?.Module?.Tags ?? DEFAULT_ENV.Module.Tags
    }
  })

  // const src = source ? pack(source, 'utf-8') : null

  // Resolve module tx id (or passthrough if aosmodule is already a tx)
  const pkgRes = await fetch('https://raw.githubusercontent.com/permaweb/aos/refs/heads/main/package.json')
  if (!pkgRes.ok) {
    throw new Error(`Failed to fetch AOS package manifest: ${pkgRes.status} ${pkgRes.statusText}`)
  }
  const pkgJson = await pkgRes.json()
  const mod = pkgJson?.aos?.[aosmodule] || aosmodule

  // Fetch wasm binary
  const binRes = await fetch('https://arweave.net/' + mod)
  if (!binRes.ok) {
    throw new Error(`Failed to fetch module binary: ${mod} -> ${binRes.status} ${binRes.statusText}`)
  }
  const binary = await binRes.blob().then(blob => blob.arrayBuffer())

  aosHandle = await AoLoader(binary, WASM64)

  // load memory with source
  let memory = null

  let updateMemory = (ctx) => {
    memory = ctx.Memory
    return ctx
  }

  // load process message
  //if (src) {
  await of({ msg: DEFAULT_ENV.Process, env: env ?? DEFAULT_ENV })
    .map(formatAOS)
    .chain(handle(binary, memory))
    .map(updateMemory)
    .toPromise()
  //}

  return {
    asOwner: async (pid) => {
      DEFAULT_ENV = await loadEnv(pid)
      // use pid to get the process tags and module tags to set as env
      return true
    },
    fromOwner: async (txOrPid) => {
      const pid = await getProcessIdFromTx(txOrPid) || txOrPid
      DEFAULT_ENV = await loadEnv(pid)
      return true
    },
    src: (srcFile, env = {}) =>
      of(srcFile)
        .map(pack)
        .map(src => ({ expr: src, env: mergeDeepRight(DEFAULT_ENV, env) }))
        .map(formatEval)
        .chain(handle(binary, memory))
        .map(updateMemory)
        .toPromise(),
    fromCheckpoint: (cid) => of(cid)
      .chain(fromPromise(fetchCheckpoint))
      .map(Buffer.from)
      .map(m => {
        updateMemory({ Memory: m })
        return true
      })
      .toPromise(),
    fromState: (tx) => of(tx)
      .chain(fromPromise(fetchState))
      .map(Buffer.from)
      .map(m => {
        updateMemory({ Memory: m })
        return true
      })
      .toPromise(),
    load: (pid) => of(pid)
      // .map(pid => `https://cu.ao-testnet.xyz/state/${pid}`)
      // .chain(fromPromise(url => fetch(url)))
      // .chain(fromPromise(res => res.arrayBuffer()))
      // .map(Buffer.from)
      .chain(fromPromise(getCheckpointTx))
      .chain(fromPromise(fetchCheckpoint))
      .map(Buffer.from)
      .map(m => {
        updateMemory({ Memory: m })
        return true
      })
      .toPromise(),
    eval: (expr, env = {}) => of({ expr, env: mergeDeepRight(DEFAULT_ENV, env) })
      .map(formatEval)
      //.map(ctx => (console.log(ctx), ctx))
      .chain(handle(binary, memory))
      .map(updateMemory)
      .toPromise()
    ,
    send: (msg, env = {}) => of({ msg, env: mergeDeepRight(DEFAULT_ENV, env) })
      .map(formatAOS)
      .chain(handle(binary, memory))
      .map(updateMemory)
      .toPromise()
  }
}



function formatEval(ctx) {
  ctx.msg = {
    Id: "MESSAGE_ID",
    Target: ctx.env?.Process?.Id || "TEST_PROCESS_ID",
    Owner: ctx.env?.Process?.Owner || "OWNER",
    Data: ctx.expr,
    Tags: [
      { name: "Action", value: "Eval" }
    ],
    From: ctx.env?.Process.Owner || "OWNER",
    Timestamp: Date.now().toString(),
    Module: ctx.env?.Module?.Id || "MODULE",
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
    Timestamp: (new Date().getTime()).toString(),
    Tags: Object
      .keys(ctx.msg)
      .filter(k => !["Target", "Owner", "Data", "Anchor", "Tags"].includes(k))
      .map(k => ({ name: k, value: ctx.msg[k] }))
  }
  //console.log(aoMsg)
  ctx.msg = aoMsg
  return ctx
}

async function getProcessIdFromTx(tx) {
  try {
    const res = await fetch('https://arweave-search.goldsky.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { transactions(ids: ["${tx}"]) { edges { node { id tags { name value } } } } }`
      })
    })
    if (!res.ok) return undefined
    const json = await res.json()
    const tags = json?.data?.transactions?.edges?.[0]?.node?.tags || []
    return tags.find(t => t.name === 'Process')?.value
  } catch {
    return undefined
  }
}

function handle(binary, mem) {
  return (ctx) => {

    return fromPromise(aosHandle)(mem, ctx.msg, ctx.env)
    // return fromPromise(AoLoader)(binary, WASM64)
    //   .chain(h => {
    //     console.log('memory: ', mem.byteLength)
    //     return fromPromise(h)(mem, ctx.msg, ctx.env)
    //   })
  }
}

