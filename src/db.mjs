// import { read, match } from "./index.js"
import { initDocument } from "./stores.js"
import { noop, mapToReduce } from "./utils.js"
import { tokenize } from "./parser/tokenizer.js"

export const write = (output = []) => (value) => output.push(value)

const stores = new WeakMap
const databaseInstance = (key) => stores.get(key)

class Database {
  #adapter
  constructor (adapter, file) {
    this.#adapter = adapter
    Object.defineProperty(this, "filename", { value: file })
    this.data = null
  }
  static async create (file) {
    const instance = new this(file)
    this.#adapter.create(instance.filename)
    console.log(`CREATED ${instance.filename}`)
    await instance.load()
    return instance
  }
  static async open (file) {
    const instance = new this(file)
    await instance.load()
    return instance
  }
  async load () {
    // const { matchType, matchToken, allStores } = initDocument()
    stores.set(this, initDocument())
    const data = await this.#adapter.open(this.filename))
    try {
      const pData = tokenize(data.toString())
      const result = pData.reduce(mapToReduce(databaseInstance(this).matchToken(noop)), null)
      // console.log(result)
      // const result = JSON.stringify(pData.map(matchToken(write)), 2, 3)
      this.data = result
    } catch (e) {
      console.error(e)
    }
  }
  save (data, prev) {
    const output = []
    const meta = { author: "Dane Brdarski", timestamp: Date.now() }
    // TODO: addRecord in next line needs to be replaced with addTaxonomy or something
    const result = databaseInstance(this).addRecord(write(output))({ data, meta, prev })
    console.log({ id: result })
    return this.#adapter.write(this.filename, output.join(""))
  }
}

export default adapter => filename => new Database(adapter, filename)
