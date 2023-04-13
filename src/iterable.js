const getDocumentId = r => r.document.id

// const add = (x, y) => x + y
const inc = x => x + 1
const key = (_, k) => k
const noop = () => {}

export default (store, storeHelpers) => {

  const withRelationships = (iterator, include) => (value, prop, target) => {
    console.log({ value, prop, target, iterator, include })
    include(prop)
    return iterator(value, prop, target)
  }

  class Query {
    #iterator
    #query
    constructor (query, iterator) {
      this.#iterator = iterator
      this.#query = query
    }
    skip (amount) {
      return amount
        ? new Query(
          this.#query,
          skip(this.#iterator, amount)
        ) : this
    }
    limit (amount) {
      return amount
        ? new Query(
          this.#query,
          limit(this.#iterator, amount)
        )
        : this
    }
    map (fn) {
      return fn
        ? new Query(
          this.#query,
          map(this.#iterator, fn)
        )
        : this
    }
    find (fn) {
      return fn
        ? new Query(
          this.#query,
          filter(this.#iterator, fn)
        )
        : this
    }
    ids () {
      return collect(
        map(this.#iterator, key)
      )
    }
    data (fn) {
      return collect(
        fn
          ? map(this.#iterator, fn)
          : this.#iterator
        )
    }
    data2 (fn) {
      const relationships = this.#query.relationships
      const includes = relationships && {}
      const iterator = relationships
        ? withRelationships(
          this.#iterator,
          storeHelpers.include(includes, relationships)
        )
        : this.#iterator
      const data = collect(
        fn
          ? map(iterator, fn)
          : iterator
        )
      if (relationships) {
        delete this.#query.relationships
        this.#query.includes = includes
      }
      return {
        data,
        ...this.#query
      }
    }
    count () {
      return reduce(this.#iterator, inc, 0)
    }
    // [Symbol.iterator]* () {
    //   let value
    //   let proceed = true
    //   const setValue = x => {
    //     value = x
    //   }
    //   while (proceed) {
    //     proceed = iterator(setValue)
    //     yield value
    //   }
    // }
    meta (meta) {
      return (meta && Object.keys(meta).length)
        ? new Query(
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
    include (...relationships) {
      return relationships.length
        ? new Query(
          {
            ...this.#query,
            relationships: new Set([
              ...this.#query.relationships ?? [],
              ...relationships
            ])
          },
          this.#iterator
        )
        : this
    }
  }

  const array = (array) => {
    let i = 0
    return fn => {
      if (i < array.length) {
        fn(array[i++], i, array)
        return true
      }
      return false
    }
  }

  const collect = (iterator, ...list) => {
    let proceed = true
    while (proceed) {
      proceed = iterator(item => list.push(item))
    }
    return list
  }

  const consume = (fn, iterator) => {
    let proceed = true
    while (proceed) {
      proceed = iterator(fn)
    }
  }

  const map = (iterator, map) => fn => {
    return iterator((value, prop, target) => {
      // map needs to be composid fro inside data() to fetch the ids
      const mapped = map(value, prop, target)
      fn(mapped, prop, target)
    })
  }

  const filter = (iterator, filter) => {
    let proceed = true
    return fn => {
      let match = false
      while (proceed && !match) {
        proceed = iterator((...args) => {
          match = filter(...args)
          match && fn(...args)
        })
      }
      return proceed
    }
  }

  const reduce = (iterator, reduce, acc) => {
    let proceed = true
    while (proceed) {
      proceed = iterator((...args) => {
        acc = reduce(acc, ...args)
      })
    }
    return acc
  }


  const skip = (iterator, skip) => {
    let i = 0
    let proceed = true
    return fn => {
      while (proceed && i++ < skip) {
        proceed = iterator(noop)
      }
      return proceed &&= iterator(fn)
    }
  }

  const limit = (iterator, limit) => {
    let i = 0
    let proceed = true
    return fn => {
      if (i++ >= limit) {
        return proceed = false
      }
      return proceed &&= iterator(fn)
    }
  }

  // const a = effect(Array.from({ length: 100000 }, (x, i) => x => { console.log(i); return x(); } ))
  // consumeEffect(a)

  // const copyPost = post => new Post(post)
  // const getPostById = id => Post.byId(id)
  //
  // const searchByTitle = (title, offset, limit) => {
  //   return Post
  //     .revisions()
  //     .filter(post => post.data.title.includes(title))
  //     .skip(offset)
  //     .limit(offset)
  //     .include([ Tag, Category ])
  //     .data(post => post.data.head)
  // }
  //
  // const createPost = p =>
  //   Post(p).save()
  //
  // const addTag = (post, ...tagIds) =>
  //   post.attach(Tag, ...tagIds)
  //
  // const addPostTaxonomy = (taxonomy, ids) =>
  //   post.attach(taxonomy, ...ids)

  return (data, ids) => {
    let i = 0
    return new Query(
      {},
      next => {
        if (i < ids.length) {
          const key = ids[i++]
          console.log("iterator", next)
          next(data[key], key, data)
          return true
        }
        return false
      }
    )
  }
}
