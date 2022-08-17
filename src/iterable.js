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

// class LazyIterable {
//   #map (fn) {
//     return new MappedQuery(this, fn)
//   }
//   #reduce (fn, ...maybeInitial) {
//     const iterator = this[Symbol.iterator]()
//     let acc, item
//     if (maybeInitial.length) {
//       acc = maybeInitial[0]
//     } else {
//       item = iterator.next()
//       if (item.done) {
//         throw TypeError('Reduce of empty collection with no initial value')
//       }
//       acc = item.value
//     }
//     do {
//       item = iterator.next()
//       if (item.done) {
//         return acc
//       }
//       acc = fn(acc, item.value)
//     } while (true)
//   }
//   find (fn) {
//     return new FindQuery(this, fn)
//   }
//   limit (limit) {
//     return limit ? new QueryLimit(this, limit) : this
//   }
//   skip (skip) {
//     return skip ? new QuerySkip(this, skip) : this
//   }
//   data (fn) {
//     return [...(fn ? this.#map(fn) : this)]
//   }
//   ids () {
//     return [...this.#map(getDocumentId)]
//   }
//   count () {
//     return this.#reduce(add, 0)
//   }
// }
//
// class Query extends LazyIterable {
//   constructor (records) {
//     this.records = records
//   }
//   *[Symbol.iterator] () {
//     for (const value of this.records.ids) {
//       yield this.handler(this.records.byId(value))
//     }
//   }
// }
//
// class MappedQuery extends LazyIterable {
//   constructor (iterable, handler) {
//     super()
//     this.iterable = iterable
//     this.handler = handler
//   }
//   *[Symbol.iterator] () {
//     for (const value of this.iterable) {
//       yield this.handler(value)
//     }
//   }
// }
//
// class FindQuery extends LazyIterable {
//   constructor (iterable, handler) {
//     super()
//     this.iterable = iterable
//     this.handler = handler
//   }
//   *[Symbol.iterator] () {
//     for (const value of this.iterable) {
//       const result = this.handler(value)
//       if (result) {
//         yield value
//       }
//     }
//   }
// }
//
// class QueryLimit extends LazyIterable {
//   constructor (iterable, limit) {
//     super()
//     this.iterable = iterable
//     this.limit = limit
//   }
//   *[Symbol.iterator] () {
//     let i = 0
//     const iterator = this.iterable[Symbol.iterator]()
//     while (i++ < this.limit) {
//       yield iterator.next().value
//     }
//   }
// }
//
// class QuerySkip extends LazyIterable {
//   constructor (iterable, skip) {
//     super()
//     this.iterable = iterable
//     this.skip = skip
//   }
//   *[Symbol.iterator] () {
//     let i = 0
//     for (const value of this.iterable) {
//       if (i++ >= this.skip) {
//         yield value
//       }
//     }
//   }
// }

// const copyPost = post => new Post(post)
// const getPostById = id => Post.byId(id)
//
//   searchByTitle (title, offset, limit) {
//     return Post
//       .revisions()
//       .find(post => post.data.title.includes(title))
//       .skip(offset)
//       .limit(offset)
//       .data(post => post.data.head)
//       .include([ Tag, Category ])
//   }
//
// const searchByTitle = (title, offset, limit) => Post
//   .revisions()
//   .find(post => post.data.title.includes(title))
//   .skip(offset)
//   .limit(offset)
//   .data(post => post.data.head)
