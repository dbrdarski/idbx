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
      return (meta && Object.keys(meta).length)
        ? new QueryItem(
          {
            ...this.#query,
            meta: {
              ...this.#query.meta,
              ...meta
            }
          },
          this.#iterator
        )
        : this
    }
    data(fn) {
      const relationships = this.#query.includeHandlers
      const [def] = relationships ?? []
      const includes = relationships && {}
      def && storeHelpers.include(def, includes)(this.#key)
      const data =
        fn
          ? fn(this.#value)
          : this.#value

      if (relationships) {
        delete this.#query.includeHandlers
        this.#query.includes = includes
      }
      return {
        data,
        ...this.#query
      }
    }
  }
  return (key, value) => {
    return new QueryItem({}, key, value)
  }
}
