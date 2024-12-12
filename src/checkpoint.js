import { gunzipSync } from 'zlib'

export async function fetchCheckpoint(tx) {
  try {
    const response = await fetch(`https://arweave.net/${tx}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${tx} : ${response.statusText}`)
    }
    const compressedBuffer = await response.arrayBuffer()
    const decompressedBuffer = gunzipSync(compressedBuffer)
    const arrayBuffer = decompressedBuffer.buffer;
    return arrayBuffer
  } catch (err) {
    console.log("Error: ", err)
    throw err
  }
}

export async function getCheckpointTx(pid) {
  try {
    const response = await fetch(`https://arweave-search.goldsky.com/graphql`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
query {
  transactions (first: 1, tags: [
      { name: "Type", values: ["Checkpoint"]},
      { name: "Process", values: ["${pid}"]}
  ]) {
    edges {
      node {
        id
      }
    }    
  }
}
      `})
    })

    if (!response.ok) {
      throw new Error(`Could not find checkpoint: ${pid} Error Code: ${response.statusText}`)
    }
    const result = await response.json()
    // console.log(result)
    return result.data?.transactions?.edges[0]?.node?.id
  } catch (err) {
    console.log("Error: ", err)
    throw err
  }
}