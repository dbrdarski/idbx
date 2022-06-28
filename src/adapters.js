import { readFile, appendFile } from "fs/promises"
import fs from "fs"

export const ascii = Object.freeze({
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
export const browser = Object.freeze({
  create (name) {
    if (localStorage.hasOwnProperty(name)){
      throw Error ("Database already exists!")
    }
    localStorage.setItem(name, "")
  },
  open (name) {
    return localStorage.getItem(name)
  },
  write (name, output) {
    return localStorage.setItem(name, `${localStorage.getItem(name)}${output}`)
  }
})
