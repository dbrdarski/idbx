const getDocumentId = r => r.document.id

const add = (x, y) => x + y
const inc = x => x + 1
const key = (_, k) => k
const noop = () => {}

class Query {
  #prev
  #query
  constructor (query, prev) {
    this.#prev = prev
    this.#query = query
  }
  skip (amount) {
    return amount
      ? new Query(
        this.#query,
        skip(this.#prev, amount)
      ) : this
  }
  limit (amount) {
    return amount
      ? new Query(
        this.#query,
        limit(this.#prev, amount)
      )
      : this
  }
  map (fn) {
    return fn
      ? new Query(
        this.#query,
        map(this.#prev, fn)
      )
      : this
  }
  find (fn) {
    return fn
      ? new Query(
        this.#query,
        filter(this.#prev, fn)
      )
      : this
  }
  ids () {
    return collect(
      map(this.#prev, key)
    )
  }
  data (fn) {
    return collect(
      fn
        ? map(this.#prev, fn)
        : this.#prev
      )
  }
  count () {
    return reduce(this.#prev, inc, 0)
  }
  // [Symbol.iterator]* () {
  //   let value
  //   let proceed = true
  //   const setValue = x => {
  //     value = x
  //   }
  //   while (proceed) {
  //     proceed = prev(setValue)
  //     yield value
  //   }
  // }
  // include (...relationships) {
  //   const inc = this.#query.include = this.#query.include ?? new Set
  //   for (const rel of relationships) {
  //     inc.add(rel)
  //   }
  //   return this
  // }
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

export default (data, ids) => {
  let i = 0
  return new Query(
    {},
    fn => {
      if (i < ids.length) {
        const key = ids[i++]
        fn(data[key], key, data)
        return true
      }
      return false
    }
  )
}

const collect = (prev, ...list) => {
  let proceed = true
  while (proceed) {
    proceed = prev(item => list.push(item))
  }
  return list
}

const consume = (fn, prev) => {
  let proceed = true
  while (proceed) {
    proceed = prev(fn)
  }
}

const map = (prev, map) => fn => {
  return prev((value, prop, target) => {
    const mapped = map(value, prop, target)
    fn(mapped, prop, target)
  })
}

const filter = (prev, filter) => {
  let proceed = true
  return fn => {
    let match = false
    while (proceed && !match) {
      proceed = prev((...args) => {
        match = filter(...args)
        match && fn(...args)
      })
    }
    return proceed
  }
}

const reduce = (prev, reduce, acc) => {
  let proceed = true
  while (proceed) {
    proceed = prev((...args) => {
      acc = reduce(acc, ...args)
    })
  }
  return acc
}


const skip = (prev, skip) => {
  let i = 0
  let proceed = true
  return fn => {
    while (proceed && i++ < skip) {
      proceed = prev(noop)
    }
    return proceed &&= prev(fn)
  }
}

const limit = (prev, limit) => {
  let i = 0
  let proceed = true
  return fn => {
    if (i++ >= limit) {
      return proceed = false
    }
    return proceed &&= prev(fn)
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
