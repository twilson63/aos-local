import { test } from 'node:test'
import * as assert from 'node:assert'
import { loadEnv } from '../src/load-env.js'

test("get env by process", async () => {
  const env = await loadEnv('dBbZhQoV4Lq9Bzbm0vlTrHmOZT7NchC_Dillbmqx0tM')
  console.log(env)
})