import { readFile, appendFile } from 'fs/promises'
import { read, match } from './index.js'
import { matchType, matchToken, allStores } from './stores.js'
import { noop, mapToReduce } from './utils.js'
import { tokenize } from './parser/tokenizer.js'

export const write = (output = []) => (value) => output.push(value)

export default class Database {
  static async create (file) {
    const instance = new this(file)

    if (fs.existsSync(instance.filename)){
      throw Error ('Database already exists!')
    }
    console.log(`CREATED ${instance.filename}`)
    // fs.mkdirSync(documentPath)
    fs.closeSync(fs.openSync(instance.filename, 'w'))

    await instance.load()
    return instance
  }
  static async open (file) {
    const instance = new this(file)
    await instance.load()
    return instance
  }
  constructor (file) {
    Object.defineProperty(this, 'filename', { value: file })
    this.data = null
  }
  async load () {
    const data = await readFile(this.filename)
    try {
      const pData = tokenize(data.toString())
      const result = pData.reduce(mapToReduce(matchToken(noop)), null)
      // console.log(result)
      // const result = JSON.stringify(pData.map(matchToken(write)), 2, 3)
      this.data = result
    } catch (e) {
      console.error(e)
    }
  }
  save (data) {
    const output = []
    const result = matchType(write(output))(data)
    return appendFile(this.filename, output.join(''))
  }
}
