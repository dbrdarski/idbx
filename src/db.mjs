// import { read, match } from "./index.js"
import { initDocument } from "./stores.js"
import { noop, mapToReduce } from "./utils.js"
import { tokenize } from "./parser/tokenizer.js"

export const write = (output = []) => (value) => output.push(value)

const stores = new WeakMap
const getStoreInstance = (key) => stores.get(key)

export const repository = adapter => init => {
  class Database {
    constructor (file) {
      Object.defineProperty(this, "filename", { value: file })
      this.data = null
    }
    async load () {
      stores.set(this, initDocument(init))
      const data = await adapter.open(this.filename)
      try {
        const pData = tokenize(data.toString())
        const result = pData.reduce(mapToReduce(getStoreInstance(this).matchToken(noop)), null)
        // const result = JSON.stringify(pData.map(matchToken(write)), 2, 3)
        this.data = result
      } catch (e) {
        console.error(e)
      }
    }
    save ({ type, id, data, publish = false, from }) {
      const output = []
      const meta = { user: "Dane Brdarski", timestamp: Date.now() }
      const result = getStoreInstance(this)
        .addRecord(
          write(output)
        )({ type, id, data, meta, publish, from })
      return adapter.write(
        this.filename,
        output.join("")
      )
    }
    query (fn) {
      return fn(getStoreInstance(this).getters)
    }
  }
  return {
    create: async (file) => {
      const instance = new Database(file)
      adapter.create(instance.filename)
      console.log(`CREATED ${instance.filename}`)
      await instance.load()
      return instance
    },
    open: async(file) => {
      const instance = new Database(file)
      await instance.load()
      return instance
    }
  }
}
