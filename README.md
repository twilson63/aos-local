# AOS Local Module

AOS Local enables developers to load AO processes locally for development and troubleshooting or data/state extraction.

> NOTE: you need to run using the `--experimental-wasm-memory64` flag

## Use Cases

* TDD - Test Drive Development
* Inspecting/Troubleshooting processes locally
* Data/State Extraction

## Basic Usage

```js
import fs from 'fs'
import { aoslocal } from '@permaweb/loco'
const src = './src/main.lua'
const aos = await aoslocal()
// load source into local process
await aos.src(src)
// evalutate any lua expression
await aos.eval("Count = 1 + 1")
// send a message
const { Output } = await aos.send({Action = "Eval", Data = "Count"})
console.log(Output.data)
```

```bash
node --experimental-wasm-memory64 index.js
```

aoslocal creates an aos instance locally that you can use an aos console like api to interact with, while the memory gets passed
to each new call.

## Load from any Checkpoint

```js
import { aoslocal } from '@permaweb/loco'

async function main() {
  const aos = await aoslocal("gX3nbh_cCkxuZAhCwA2XiAMRrjQMHYFInPN5YVQhnfk")
  await aos.asOwner("Q9mnzqVuiEsCPcR_NrmqHnK5Foz4DnCFcVsB9nHh9yk")
  await aos.fromCheckpoint("hLaYFmwQkP4Fe5xVaE2OBxFyrLnD9LnCGg-toftabL0")
  const result = await aos.eval('1 + 1')
  console.log(result)
}

main()
```



## API

### src(srcFile: String, [env] : { Process, Module })

loads source into process

### load(processId : String, [env] : { Process, Module })

loads latest checkpoint into a process for evals

### eval(expression : String, [env] : { Process, Module }) : async(AOS_Result)

evaluates an expression and returns an AOS Result Object

### send(message : AOS_Message, [env] : { Process, Module }) : async(AOS_Result)

send a message to be handled by the aos process and receive a Result Object

### AOS_Message

`Record<string, string>`

### AOS_Result

```
{
  Output: {
    data: string
  },
  Messages: Record<string, any>[],
  Spawns: Record<string, any>[],
  Assignments: Record<string, any>[]
}
```

