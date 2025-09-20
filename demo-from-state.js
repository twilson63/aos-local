// Demo: load VM memory from a state TX and eval an expression
// Usage:
//   node --experimental-wasm-memory64 demo-from-state.js <STATE_TX> [PROCESS_ID]
// Example:
//   node --experimental-wasm-memory64 demo-from-state.js XJKkBRxeF0tCrOrJDbXNkTgNXypghxKfGFYL1hVTdmw

import { aoslocal } from './src/index.js'

// Fixed module TX per request to ensure binary compatibility
const DEFAULT_MODULE_TX = 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s'

async function fetchProcessIdFromStateTx(tx) {
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

async function main() {
  const [, , argTx, argPid] = process.argv
  const txId = argTx || 'XJKkBRxeF0tCrOrJDbXNkTgNXypghxKfGFYL1hVTdmw'

  const aos = await aoslocal(DEFAULT_MODULE_TX)

  if (argPid) {
    await aos.asOwner(argPid)
  } else {
    // Resolve from state TX and set owner env automatically
    await aos.fromOwner(txId)
  }

  const ok = await aos.fromState(txId)
  console.log('fromState:', ok)

  const result = await aos.eval('1 + 1')
  console.log('Eval Output:', result?.Output?.data)
}

main().catch((err) => {
  console.error('Demo failed:', err)
  process.exit(1)
})
