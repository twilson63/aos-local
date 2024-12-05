import { aoslocal, SQLITE } from '../src/index.js'

async function main() {
  try {
    const aos = await aoslocal("./test/example.lua", SQLITE)
    await aos.send({
      Target: "TEST_PROCESS_ID",
      Owner: "OWNER",
      Action: "Info",
      Data: "Hello World"
    })
    const result = await aos.eval("#Inbox")
    console.log(result.Output.data)

  } catch (e) {
    console.log(e)
  }
}

main()