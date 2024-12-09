import { aoslocal, SQLITE } from '../src/index.js'

async function main() {
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
    console.log(result.Output.data)

  } catch (e) {
    console.log(e)
  }
}

main()