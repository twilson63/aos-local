import { gunzipSync } from 'zlib'
import fs from 'fs'

const MAX_STATE_BYTES = 2n * 1024n * 1024n * 1024n // 2 GiB

function sanitizeTxId(tx) {
  if (typeof tx !== 'string' || !/^[A-Za-z0-9_-]{43,64}$/.test(tx)) {
    throw new Error('Invalid tx id format')
  }
  return tx
}

function withTimeout(ms) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, done: () => clearTimeout(id) }
}

export async function fetchCheckpoint(tx) {
  try {
    tx = sanitizeTxId(tx)
    const fileName = `${tx}.bin`
    if (fs.existsSync(fileName)) {
      return await readLargeFile(fileName)
    }
    const { signal, done } = withTimeout(30000)
    const response = await fetch(`https://arweave.net/${tx}`, { signal })
    done()

    if (!response.ok) {
      throw new Error(`Failed to fetch checkpoint: ${tx} : ${response.status} ${response.statusText}`)
    }
    const clen = response.headers?.get?.('content-length')
    if (clen && BigInt(clen) > MAX_STATE_BYTES) {
      throw new Error(`Checkpoint too large: ${clen} bytes`)
    }

    const compressedBuffer = await response.arrayBuffer()

    const decompressedBuffer = gunzipSync(compressedBuffer)
    const buffer = decompressedBuffer.buffer;
    await writeLargeBufferToFile(fileName, Buffer.from(buffer))
    return buffer
  } catch (err) {
    // rethrow with context
    throw new Error(`fetchCheckpoint: ${err?.message || err}`)
  }
}

/**
 * Fetches a process state memory by TXID and caches it.
 * Tries AO testnet state endpoint first, then falls back to Arweave.
 * @param {string} tx - The state TXID
 * @returns {Promise<Buffer>} - Raw memory buffer
 */
export async function fetchState(tx) {
  try {
    tx = sanitizeTxId(tx)
    const fileName = `${tx}.bin`
    if (fs.existsSync(fileName)) {
      return await readLargeFile(fileName)
    }

    const { signal, done } = withTimeout(30000)
    // Primary: AO testnet state endpoint
    let response = await fetch(`https://cu.ao-testnet.xyz/state/${tx}`, { signal })
    done()
    if (!response.ok) {
      const t2 = withTimeout(30000)
      response = await fetch(`https://arweave.net/${tx}`, { signal: t2.signal })
      t2.done()
      if (!response.ok) {
        throw new Error(`Failed to fetch state: ${tx} via both endpoints (last: ${response.status} ${response.statusText})`)
      }
    }

    const clen = response.headers?.get?.('content-length')
    if (clen && BigInt(clen) > MAX_STATE_BYTES) {
      throw new Error(`State too large: ${clen} bytes`)
    }

    const arrayBuf = await response.arrayBuffer()
    let buffer = Buffer.from(arrayBuf)

    const enc = response.headers?.get?.('content-encoding') || ''
    const isGzip = enc.includes('gzip') || (buffer[0] === 0x1f && buffer[1] === 0x8b)
    if (isGzip) {
      buffer = gunzipSync(buffer)
    }

    await writeLargeBufferToFile(fileName, buffer)
    return buffer
  } catch (err) {
    throw new Error(`fetchState: ${err?.message || err}`)
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

/**
 * Writes a buffer to a file using a stream, allowing large files (>2GB).
 * @param {Buffer} buffer - The buffer to write to the file.
 * @param {string} filePath - The path of the file to write to.
 * @returns {Promise<void>}
 */
function writeLargeBufferToFile(filePath, buffer) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath)

    // Split the buffer into chunks for streaming (1 MiB)
    const chunkSize = 1024 * 1024
    let offset = 0

    const writeNextChunk = () => {
      while (offset < buffer.length) {
        const chunk = buffer.slice(offset, offset + chunkSize)
        offset += chunkSize

        // Check if the stream buffer is full
        if (!writeStream.write(chunk)) {
          writeStream.once('drain', writeNextChunk)
          return
        }
      }

      // End the stream once all chunks are written
      writeStream.end()
    }

    writeStream.on('finish', resolve)
    writeStream.on('error', reject)

    // Start writing the first chunk
    writeNextChunk()
  })
}

/**
 * Reads a large file and returns its content as a single Buffer.
 * @param {string} filePath - The path of the file to read.
 * @returns {Promise<Buffer>} - A promise that resolves to the file's content as a Buffer.
 */
function readLargeFile(filePath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const readStream = fs.createReadStream(filePath);

    readStream.on('data', (chunk) => {
      // Collect each chunk into the array
      chunks.push(chunk);
    });

    readStream.on('end', () => {
      // Concatenate all chunks into a single Buffer
      resolve(Buffer.concat(chunks));
    });

    readStream.on('error', (err) => {
      // Handle errors
      reject(err);
    });
  });
}