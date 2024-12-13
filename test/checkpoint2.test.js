import { aoslocal } from '../src/index.js'

const PROCESS = "1OEAToQGhSKV76oa1MFIGZ9bYxCJoxpXqtksApDdcu8"
const MODULE = "L0R0-HrGcs8az_toOi06jLcBbjU0UsudpqIv9K-jBCw"

// const PROCESS = "6poPdECzioaWeCSCf1YnZ9lkavQqaCmr3xywOWSEtm8"
// const MODULE = "pvXvNCa-svBhc1ovojvqFn3YlWiP2fZiWR7gKvEGOPQ"

async function main() {
  const aos = await aoslocal(MODULE)

  await aos.load(PROCESS)

  const Env = {
    Process: {
      Id: "1OEAToQGhSKV76oa1MFIGZ9bYxCJoxpXqtksApDdcu8",
      Owner: "bUPyN5S1oR44mG1AQ51qgSZPmv985RiMqFiB3q9tUZU",
      Tags: [
        { name: "Data-Protocol", value: "ao" },
        { name: "Variant", value: "ao.TN.1" },
        { name: "Type", value: "Process" },
        { name: "Authority", value: "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY" }
      ],
    },
    Module: {
      Id: "L0R0-HrGcs8az_toOi06jLcBbjU0UsudpqIv9K-jBCw",
      Tags: [
        { name: "Data-Protocol", value: "ao" },
        { name: "Variant", value: "ao.TN.1" },
        { name: "Type", value: "Module" },
      ]
    }
  }
  const result = await aos.eval("dbAdmin:exec [[select * from Oracles;]]", Env)
  // const result = await aos.send({
  //   Target: "1OEAToQGhSKV76oa1MFIGZ9bYxCJoxpXqtksApDdcu8",
  //   Owner: "bUPyN5S1oR44mG1AQ51qgSZPmv985RiMqFiB3q9tUZU",
  //   Action: "Eval",
  //   Module: "L0R0-HrGcs8az_toOi06jLcBbjU0UsudpqIv9K-jBCw",
  //   Data: "Balances['vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI']"
  // }, Env).catch(err => {

  //   console.log(err)
  //   return { Output: { data: '1234' } }
  // })
  //console.log(result)
  console.log(result.Output.data)


}

main()
