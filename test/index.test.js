import { aoslocal, SQLITE } from '../src/index.js'
import { test } from 'node:test'
import * as assert from 'node:assert'

test('basic', async () => {
  try {
    const aos = await aoslocal(SQLITE)
    await aos.src("./test/example.lua")
    // await aos.send({
    //   Target: "TEST_PROCESS_ID",
    //   Owner: "OWNER",
    //   Action: "Info",
    //   Data: "Hello World"
    // })
    const result = await aos.eval("Hello('bill')")
    assert.equal(result.Output.data, 'Bonjour bill')

  } catch (e) {
    console.log(e)
  }
})
