const getDocumentId = r => r.document.id

const add = (x, y) => x + y
const key = (_, k) => k

class Query {
  #data
  constructor (data) {
    this.#data = data
  }
  skip (amount) {
    return amount
      ? new Query(
        skip(this.#data, amount)
      ) : this
  }
  limit (amount) {
    return amount
      ? new Query(
        limit(this.#data, amount)
      ) : this
  }
  find (fn) {
    return new Query(
      filter(this.#data, fn)
    )
  }
  ids () {
    return collect(
      map(this.#data, key)
    )
  }
  data (fn) {
    return collect(
      fn
        ? map(this.#data, fn)
        : this.#data
      )
  }
  count () {
    return reduce(this.#data, add, 0)
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

export default (data, ids) => {
  let i = 0
  return new Query(fn => {
    if (i < ids.length) {
      const key = ids[i++]
      fn(data[key], key, data)
      return true
    }
    return false
  })
}

const collect = (next, ...list) => {
  let proceed = true
  while (proceed) {
    proceed = next(item => list.push(item))
  }
  return list
}

const consume = (fn, next) => {
  let proceed = true
  while (proceed) {
    proceed = next(fn)
  }
}

const map = (next, map) => fn => {
  return next((value, prop, target) => {
    const mapped = map(value, prop, target)
    fn(mapped, prop, target)
  })
}

const filter = (next, filter) => {
  let proceed = true
  return fn => {
    let match = false
    while (proceed && !match) {
      proceed = next((...args) => {
        match = filter(...args)
        match && fn(...args)
      })
    }
    return proceed
  }
}

const reduce = (next, reduce, acc) => {
  let proceed = true
  while (proceed) {
    proceed = next((...args) => {
      acc = reduce(acc, ...args)
    })
  }
  return acc
}


const skip = (next, skip) => {
  let i = 0
  let proceed = true
  return fn => {
    while (proceed) {
      proceed = next((...args) => {
        i++ >= skip && fn(...args)
      })
    }
  }
}

const limit = (next, limit) => {
  let i = 0
  let proceed = true
  return fn => {
    if (i++ >= limit) {
      return proceed = false
    }
    return proceed &&= next(fn)
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
//     .find(post => post.data.title.includes(title))
//     .skip(offset)
//     .limit(offset)
//     .data(post => post.data.head)
//     .include([ Tag, Category ])
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
