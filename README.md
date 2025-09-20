# AOS Local

Develop and troubleshoot AO processes locally by loading a wasm module and
interacting with it via a simple JS API.

## Requirements
- Node 20+ (ESM only)
- Always run with `--experimental-wasm-memory64` (or set `NODE_OPTIONS`)

## Install
```bash
npm i @permaweb/loco
# or
yarn add @permaweb/loco
```

## Quick Start
```js
import { aoslocal, SQLITE } from '@permaweb/loco'

async function main() {
  const aos = await aoslocal(SQLITE) // or omit for latest default
  await aos.src('./test/example.lua') // bundles local Lua requires automatically

  const evalRes = await aos.eval('Count = 1 + 1')
  const { Output } = await aos.send({ Action: 'Eval', Data: 'Count' })
  console.log(Output.data)
}

main()
```
Run with the memory flag (or export once):
```bash
NODE_OPTIONS="--experimental-wasm-memory64" node index.js
```

## API
- `aoslocal(aosmodule = LATEST, env?)` → Promise<AOS>
  - `aosmodule`: use `SQLITE`, `LLAMA`, `LATEST` or an Arweave TX id
  - `env`: `{ Process, Module }` defaults are provided for local dev
- `aos.src(srcFile, env?)` → loads Lua source; packs `require()` graph into one
- `aos.eval(expr, env?)` → AOS_Result for an Eval action
- `aos.send(message, env?)` → AOS_Result; any extra fields become Tags
- `aos.load(processId)` → loads latest checkpoint for a process
- `aos.fromCheckpoint(txId)` → loads a specific checkpoint
- `aos.fromState(txId)` → downloads VM memory from `https://cu.ao-testnet.xyz/state/${txId}` and loads it
- `aos.asOwner(processId)` → derives default env from a live process
- `aos.fromOwner(txOrPid)` → resolves Process from a state TX (if given), sets env

Types
```ts
// AOS_Message
Record<string, string>

// AOS_Result
{
  Output: { data: string },
  Messages: Record<string, any>[],
  Spawns: Record<string, any>[],
  Assignments: Record<string, any>[]
}
```

## Checkpoints & Caching
- Checkpoints are fetched from Arweave and cached as `<txId>.bin` in CWD
- `fromState` fetches from the AO testnet state endpoint and also caches as `<txId>.bin`
- Large files are streamed to disk; subsequent runs reuse the cache
- Network is required for first load of module binary and checkpoints/state

## Testing
- All tests: `npm test`
- Single file: `npm test -- test/index.test.js`
- Name pattern: `npm test -- --test-name-pattern="basic"`

License: MIT


