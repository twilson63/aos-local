export async function fetchEnv(pid) {
  const processTx = await fetchTx(pid)
  const mod = processTx.tags.find(t => t.name === "Module").value
  const moduleTx = await fetchTx(mod)
  return { Process: processTx, Module: moduleTx }

}

async function fetchTx(tx) {
  try {
    const response = await fetch(`https://arweave.net/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
query {
  transaction(id: "${tx}") {
    id
    tags {
      name
      value
    }
    block {
      height
    }
  }
}
      `
      })
    })
    if (!response.ok) {
      throw new Error(`Could not fetch Tx: ${pid}`)
    }
    const result = await response.json()
    //console.log(result)
    return result.data?.transaction
  } catch (err) {
    console.log("Error: ", err)
    throw err
  }
}