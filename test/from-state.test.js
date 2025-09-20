import { test } from 'node:test'
import * as assert from 'node:assert'
import { aoslocal, SQLITE } from '../src/index.js'

// Test the API shape by mocking only the state endpoint to avoid
// writing large files from network during test. Let wasm load normally.

const rawBuffer = Buffer.from('hello-world')

function makeResponse(body, encoding) {
  return {
    ok: true,
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    headers: { get: (k) => (k === 'content-encoding' ? encoding : null) }
  }
}

test('fromState loads memory and returns true', async () => {
  const originalFetch = global.fetch
  global.fetch = async (url, ...rest) => {
    if (String(url).includes('cu.ao-testnet.xyz/state/')) {
      return makeResponse(rawBuffer)
    }
    return originalFetch(url, ...rest)
  }
  try {
    const aos = await aoslocal(SQLITE)
    const ok = await aos.fromState('XJKkBRxeF0tCrOrJDbXNkTgNXypghxKfGFYL1hVTdmw')
    assert.equal(ok, true)
    assert.ok(typeof aos.eval === 'function')
  } finally {
    global.fetch = originalFetch
  }
})
