import { getActiveQueryInstance } from "./query"

export default (store, storeHelpers) => {
  class QueryItem {
    #query
    #key
    #value
    constructor(query, key, value) {
      this.#query = query
      this.#key = key
      this.#value = value
    }
    meta(meta) {
      if (meta) {
        this.#query.meta = {
          ...this.#query.meta,
          ...meta
        }
      }
      return this
      // return (meta && Object.keys(meta).length)
      //   ? new QueryItem(
      //     {
      //       ...this.#query,
      //       meta: {
      //         ...this.#query.meta,
      //         ...meta
      //       }
      //     },
      //     this.value
      //   )
      //   : this
    }
    data(fn) {
      const relationships = this.#query.includeHandlers
      const hasRelationships = Boolean(relationships?.size)
      if (hasRelationships) {
        const [def] = relationships ?? []
        this.#query.includes = this.#query.includes ?? {}
        storeHelpers.include(def, this.#query.includes)(this.#key)
      }
      const data =
        fn
          ? fn(this.#value)
          : this.#value

      return data
    }
  }
  return (key, value) => {
    const query = getActiveQueryInstance()
    return new QueryItem(query, key, value)
  }
}
