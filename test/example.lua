local greeting = require("example2")

function Hello(name)
  BEEP = name
  print(greeting .. " " .. name)
end
