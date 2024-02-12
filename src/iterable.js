import { getActiveQueryInstance } from "./query.js"
// const getDocumentId = r => r.document.id

// const add = (x, y) => x + y
const inc = x => x + 1
const key = (_, k) => k
const noop = () => { }

export default (store, storeHelpers) => {
  class Query {
    #iterator
    #query
    constructor(query, iterator) {
      this.#iterator = iterator
      this.#query = query
    }
    skip(amount) {
      return amount
        ? new Query(
          this.#query,
          skip(this.#iterator, amount)
        ) : this
    }
    limit(amount) {
      return amount
        ? new Query(
          this.#query,
          limit(this.#iterator, amount)
        )
        : this
    }
    map(fn) {
      return fn
        ? new Query(
          this.#query,
          map(this.#iterator, fn)
        )
        : this
    }
    find(fn) {
      return fn
        ? new Query(
          this.#query,
          filter(this.#iterator, fn)
        )
        : this
    }
    reduce(fn, init) {
      return fn ? reduce(this.#iterator, fn, init) : this
    }
    count() {
      return reduce(this.#iterator, inc, 0)
    }
    include(fn) {
      // should this mutate or return new query?
      fn && (this.#query.includeHandlers = (this.#query.includeHandlers ?? new Set).add(fn))
      return this
    }
    ids() {
      return collect(
        map(this.#iterator, key)
      )
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
      //   ? new Query(
      //     {
      //       ...this.#query,
      //       meta: {
      //         ...this.#query.meta,
      //         ...meta
      //       }
      //     },
      //     this.#iterator
      //   )
      //   : this
    }
    data(fn) {
      const relationships = this.#query.includeHandlers
      const [def] = relationships ?? []
      const hasRelationships = relationships?.size
      if (hasRelationships) {
        this.#query.includes = this.#query.includes ?? {}
      }
      const iterator = hasRelationships
        ? include(
          this.#iterator,
          storeHelpers.include(def, this.#query.includes)
        )
        : this.#iterator
      const data = collect(
        fn
          ? map(iterator, fn)
          : iterator
      )
      return data
    }
  }

  // const array = (array) => {
  //   let i = 0
  //   return next => {
  //     if (i < array.length) {
  //       next(array[i], i++, array)
  //       return true
  //     }
  //     return false
  //   }
  // }

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

  const map = (iterator, map) => next => {
    return iterator((value, prop, target) => {
      // map needs to be composid fro inside data() to fetch the ids
      const mapped = map(value, prop, target)
      next(mapped, prop, target)
    })
  }

  const filter = (iterator, filter) => {
    let proceed = true
    return next => {
      let match = false
      while (proceed && !match) {
        proceed = iterator((...args) => {
          match = filter(...args)
          match && next(...args)
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
    return next => {
      while (proceed && i++ < skip) {
        proceed = iterator(noop)
      }
      return proceed &&= iterator(next)
    }
  }

  const limit = (iterator, limit) => {
    let i = 0
    let proceed = true
    return next => {
      if (i++ >= limit) {
        return proceed = false
      }
      return proceed &&= iterator(next)
    }
  }

  const include = (iterator, include) => next => {
    return iterator((value, prop, target) => {
      include(prop)
      next(value, prop, target)
    })
  }

  // const a = effect(Array.from({ length: 100000 }, (x, i) => x => { console.log(i); return x(); } ))
  // consumeEffect(a)

  // const copyPost = post => new Post(post)
  // const getPostById = id => Post.byId(id)
  //
  // const searchByTitle = (title, offset, limit) => {
  //   return Post
  //     .latest({
  //        id?,
  //        status: Post.Status.Archived
  //      })
  //     .revision(id)
  //     .revisions(id?)
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

  // return (data, ids) => {
  //   const iterator = ids[Symbol.iterator]()
  //   return new Query(
  //     {},
  //     next => {
  //       const { value: key, done } = iterator.next()
  //       if (done) return false
  //       next(data[key], key, data)
  //       return true
  //     }
  //   )
  // }

  return (data, ids) => {
    let i = 0
    const query = getActiveQueryInstance()
    return new Query(
      query,
      next => {
        if (i < ids.length) {
          const key = ids[i++]
          next(data[key], key, data)
          return true
        }
        return false
      }
    )
  }
}
