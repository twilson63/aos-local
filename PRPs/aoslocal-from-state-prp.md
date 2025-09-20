# Project Request Protocol (PRP): AOS Local `fromState(txId)`

## Project Overview
Add a new capability to AOS Local to fetch a process state snapshot by TXID from the Weave and hydrate the in-memory VM with that state. The new API, `fromState(txId)`, queries the AO testnet state endpoint, downloads the memory blob for the provided TXID, and loads it into the WebAssembly runtime so developers can immediately evaluate Lua expressions and send messages against that historical state.

## Technical Requirements
- API: `aos.fromState(txId: string): Promise<boolean>`
- Endpoint: `https://cu.ao-testnet.xyz/state/${txId}` (per request). If deprecated/unavailable, support fallback to `https://arweave.net/${txId}` when content is a gzipped memory buffer.
- Memory handling:
  - Accepts ArrayBuffer/Buffer payloads; convert to Node Buffer as needed.
  - If response is gzipped, gunzip before loading.
  - Store a local cache file `<txId>.bin` to speed subsequent loads (streamed read/write for large files).
- WASM integration: update AOS Local’s internal memory reference and keep it for subsequent `eval`/`send` calls.
- Errors: verify `res.ok` and throw contextual errors (include `txId` and endpoint).
- Node: works with Node 20+, always with `--experimental-wasm-memory64`.
- Tests: add targeted tests that mock fetch and verify memory load/update behavior.

## Proposed Solutions
1) Direct Fetch + Stream Cache (Preferred)
- Fetch `state/${txId}` via fetch, detect content-encoding, stream to file `<txId>.bin`, then load Buffer into WASM.

2) GraphQL-first Lookup + Fallback Fetch
- Resolve `txId` via a GraphQL query to confirm existence/metadata, then fetch memory from resolved endpoint (.state link) or Arweave.

3) CLI Helper Wrapper
- Introduce a thin CLI command (`npx aoslocal from-state <txId>`) that fetches the memory and writes to disk; library reads `<txId>.bin` then loads memory.

## Pros / Cons
1) Direct Fetch + Stream Cache
- Pros: Simple, minimal latency, reuses existing checkpoint read/write utilities, fewer moving parts.
- Cons: Requires careful handling of large payloads and gzip detection.

2) GraphQL-first Lookup + Fallback Fetch
- Pros: Early validation, richer errors, can select best endpoint dynamically.
- Cons: More network calls, more code complexity, two failure modes.

3) CLI Helper Wrapper
- Pros: Useful for scripting and CI; separates fetch concerns.
- Cons: Indirect for library users; duplicates logic; adds maintenance surface.

## Best Solution
Choose (1) Direct Fetch + Stream Cache. It’s the most direct, aligns with current checkpoint utilities in `src/checkpoint.js`, and keeps the API focused and small while remaining performant and reliable.

## Implementation Steps
- Add API: `fromState(txId)` to the returned object from `aoslocal` in `src/index.js`.
  - Endpoint fetch: `https://cu.ao-testnet.xyz/state/${txId}`.
  - If `Content-Encoding: gzip` or data appears gzipped, gunzip to raw memory.
  - Write streamed result to `<txId>.bin` (reuse `writeLargeBufferToFile`).
  - Update internal memory reference similar to `fromCheckpoint`/`load` path.
- Implemented `fetchState(txId)` in `src/checkpoint.js` with caching and gzip detection.
- Tests:
  - Added `test/from-state.test.js` that mocks only the state endpoint to validate API flow without wasm mocking.
  - Consider adding a gzip case with a compressed buffer if needed.
  - Verify cache read path when `<txId>.bin` exists.
- Docs:
  - README: added `fromState` usage and notes.
  - AGENTS.md: mentioned `fromState` and test guidance on mocking.

## Success Criteria
- Calling `aos.fromState(<txId>)` loads memory and returns `true`.
- A subsequent `aos.eval('1 + 1')` succeeds and uses the loaded memory.
- Large memory blobs (>2GB) are supported via streaming with no crashes.
- Cache file `<txId>.bin` is created and reused on next call.
- Tests cover: success path, gzipped payload, cache hit, network error.
- Documentation updated and clear for both library and agent users.
