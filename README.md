# AOS Local Module

A module that can be used to run commands against aos instances in a local environment. The main purpose of this module is to be used when writing integration tests for aos.

## Usage

```js
import fs from 'fs'
import { aoslocal, SQLITE } from '@permaweb/loco'
const src = './src/main.lua'
const aos = await aoslocal(src, SQLITE)

const result = await aos.eval("1 + 1")

console.log(result.Output.data)
```

## API

### load(processId : String)

loads latest checkpoint into a process for evals

### eval(expression : String) : async(AOS_Result)

evaluates an expression and returns an AOS Result Object

### send(message : AOS_Message) : async(AOS_Result)

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
