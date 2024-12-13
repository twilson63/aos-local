import { gunzipSync } from 'zlib'
import fs from 'fs'
export async function fetchCheckpoint(tx) {
  try {
    const fileName = `${tx}.bin`
    if (fs.existsSync(fileName)) {
      return await readLargeFile(fileName)
    }
    const response = await fetch(`https://arweave.net/${tx}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${tx} : ${response.statusText}`)
    }
    const compressedBuffer = await response.arrayBuffer()

    const decompressedBuffer = gunzipSync(compressedBuffer)
    const buffer = decompressedBuffer.buffer;
    //fs.writeFileSync(fileName, Buffer.from(buffer))
    await writeLargeBufferToFile(fileName, Buffer.from(buffer))
    return buffer
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

/**
 * Writes a buffer to a file using a stream, allowing large files (>2GB).
 * @param {Buffer} buffer - The buffer to write to the file.
 * @param {string} filePath - The path of the file to write to.
 * @returns {Promise<void>}
 */
function writeLargeBufferToFile(filePath, buffer) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);

    // Split the buffer into chunks for streaming
    const chunkSize = 64 * 1024; // 64KB
    let offset = 0;

    const writeNextChunk = () => {
      while (offset < buffer.length) {
        const chunk = buffer.slice(offset, offset + chunkSize);
        offset += chunkSize;

        // Check if the stream buffer is full
        if (!writeStream.write(chunk)) {
          writeStream.once('drain', writeNextChunk);
          return;
        }
      }

      // End the stream once all chunks are written
      writeStream.end();
    };

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    // Start writing the first chunk
    writeNextChunk();
  });
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