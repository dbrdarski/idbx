import { initDocument } from "./stores.js"
import { noop, mapToReduce } from "./utils.js"
import { tokenize } from "./parser/tokenizer.js"

export const write = (output = []) => (value) => output.push(value)

const stores = new WeakMap
const getStoreInstance = (key) => stores.get(key)

export const repository = adapter => init => {
  class ContentRepository {
    constructor (file) {
      Object.defineProperty(this, "filename", { value: file })
      this.data = null
    }
    async load () {
      stores.set(this, initDocument(this, init))
      const data = await adapter.open(this.filename)
      try {
        const pData = tokenize(data.toString())
        const result = pData.reduce(
          mapToReduce(
            getStoreInstance(this)
              .matchToken(noop)
          ),
          null
        )
        this.data = globalThis.dbData = result
      } catch (e) {
        console.error(e)
      }
    }
    save ({ type, id, data, publish = true, from }) {
      // console.log("SAVING", { type, id, data, publish, from })
      const output = []
      const meta = {
        user: "Dane Brdarski",
        timestamp: Date.now()
      }
      const records = getStoreInstance(this)
      const result = records
        .addRecord(
          write(output)
        )({ type, id, data, meta, publish, from })
      adapter.write(
        this.filename,
        output.join("")
      )
      return records.getRecord(result)
    }
    query (fn) {
      return fn(getStoreInstance(this).methods)
    }
  }
  return {
    create: async (file) => {
      const instance = new ContentRepository(file)
      adapter.create(instance.filename)
      console.log(`CREATED ${instance.filename}`)
      await instance.load()
      return instance
    },
    open: async(file) => {
      const instance = new ContentRepository(file)
      await instance.load()
      return instance
    }
  }
}
