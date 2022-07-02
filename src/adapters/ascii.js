import { readFile, appendFile } from "fs/promises"
import fs from "fs"

export default Object.freeze({
  create (name) {
    if (fs.existsSync(name)){
      throw Error ("Database already exists!")
    }
    fs.closeSync(fs.openSync(name, "w"))
  },
  open (name) {
    return readFile(name)
  },
  write (name, output) {
    return appendFile(name, output)
  }
})
