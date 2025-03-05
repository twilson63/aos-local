# AOS Local Module

A module that can be used to run commands against aos instances in a local environment. The main purpose of this module is to be used when writing integration tests for aos.

## Usage

```js
import fs from 'fs'
import { aoslocal, SQLITE } from '@permaweb/loco'
const src = './src/main.lua'
const aos = await aoslocal(SQLITE)

const result = await aos.eval("1 + 1")

console.log(result.Output.data)
```

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

