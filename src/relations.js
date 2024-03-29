import { nameSymbol, once } from "./utils.js"

const applyContext = context => fn => fn.call(context)
const apply = fn => fn()

const getOrSetDefault = (target, key, initDefaultValue) => {
  if (!target.hasOwnProperty(key)) {
    return target[key] = initDefaultValue()
  }
  return target[key]
}

const createEmptyObject = () => ({})
// const isModel = Symbol("isModel")
const noop = () => { }

const mergeSetsIterator = (sets) => (
  new Set([...sets.map(set => Array.from(set))])
)[Symbol.iterator]()

const mergeSetsLazyIterator = function*(sets) {
  const passed = new Set
  for (const set of sets) {
    for (const item of set) {
      if (!passed.has(item)) {
        passed.add(item)
        yield item
      }
    }
  }
}

const isPublished = Symbol("isPublished")
const isArchived = Symbol("isArchived")
const documentId = Symbol("documentId")
const revisionId = Symbol("revisionId")

const allRelationships = {}
const relStore = new Map()
const inverseRelations = {}

// p.get = Proxy(model :: Model, handler :: Iterable => Iterable)
export const generateRelations = (context, store, methods, type, typeInit, def) => {
  const modelSchema = {
    type,
    model: typeInit,
    // relations: {},
    // handlers: {}
  }
  relStore.set(typeInit, modelSchema)
  const storeHelpers = store[type]
  const relationships = allRelationships[type] = {}

  // activeDocuments aka active
  const activeDocuments = relationships.activeDocuments = {} // { [documentId]: Set(documentId) }
  const documentsByRevision = relationships.documentsByRevision = {} // { [revisionId]: Set(documentId) }
  const revisionsByDocument = relationships.revisionsByDocument = {} // { [documentId]: Set(revisionId) }
  const schema = relationships.schema = {
    [nameSymbol]: type
  }

  let validatedModel = null

  const initializer = []
  const finalizer = []
  const validatorPrototype = {}
  storeHelpers.include = (handler, includes) => {
    return handler(includeProxy(includes), modelProxy(typeInit, includes, typeInit[nameSymbol]))
  }
  const setter = (includes, rel) => {
    const path = includes[rel] = includes[rel] || {}
    return item => path[item.document.id] = item
  }
  const recorder = (set, rel, type, parentName, handler, id) => {
    const connections = allRelationships[parentName].activeDocuments[id]?.[rel]
    if (connections == null) return // TODO: investigate connections.length
    for (const record of store[type]?.getActiveDocuments(...connections)) {
      set(record)
      handler?.(record.document.id)
    }
  }
  const includeProxy = (includes) => {
    const proxy = new Proxy(noop, {
      get(_, prop) {
        return setter.bind(null, includes, prop)
      },
      apply(_, thisArg, models) {
        const handlers = models.map(apply)
        return item => {
          for (const handler of handlers) {
            handler(item)
          }
        }
      }
    })
    return proxy
  }
  const modelProxy = (model, includes, parentName, parentRel) => {
    const proxy = new Proxy(noop, {
      get(_, prop) {
        if (!prop in model) {
          console.error(
            Error(`Model ${model[nameSymbol]} has no relationship named '${prop}'`)
          )
          return
        }
        const value = model[prop]
        return relStore.has(value) // Not sure what the edge case is for !relStore.has(value)
          ? modelProxy(value, includes, model[nameSymbol], prop) // TODO: think if we need this (relStore) -> type === "function"
          : value
      },
      apply(_, thisArg, fns) {
        if (fns.length) { // called with arguments
          let set, childrenHandler
          fns.forEach(fn => {
            if (fn.length) { // if hadnler function has arguments it's recursive inclusion of sub relationship
              childrenHandler = fn(proxy)
            } else {
              set = fn()
            }
          })
          set = set ?? setter(includes, parentRel)
          return () => recorder.bind(null, set, parentRel, model[nameSymbol], parentName, childrenHandler)
        } else { // called without arguments
          const set = setter(includes, parentRel)
          return recorder.bind(null, set, parentRel, model[nameSymbol], parentName, null)
        }
      }
    })
    return proxy
  }

  storeHelpers.addRelation = (name, methods) => {
    validatorPrototype[name] = methods
  }

  storeHelpers.selectModel = (docId, revId, published, archived = false) => {
    validatedModel = Object.create(validatorPrototype, {
      [isPublished]: { value: published },
      [isArchived]: { value: archived },
      [documentId]: { value: docId },
      [revisionId]: { value: revId }
      // [rel]: { value: {} }
    })
    initializer.forEach(applyContext(validatedModel))
  }

  storeHelpers.releaseModel = () => {
    finalizer.forEach(applyContext(validatedModel))
    validatedModel = null
  }

  const relProxy = (parentModel, parentHandler, rel) => new Proxy(noop, {
    get(_, prop) {
      if (!prop in relStore) {
        throw Error(`Model ${parentModel[nameSymbol]} has no relationship named '${prop}'`)
      }
      const [model, relationKey, inversed] = inverseRelations[parentModel[nameSymbol]][prop]
      rel.inversed ??= !inversed
      const handler = args => parentHandler(
        store[model].queryRelationship(
          rel.active ? "activeDocuments" : inversed ? "documentsByRevision" : "revisionsByDocument",
          relationKey,
          args
        )
      )
      return relProxy(parentModel[prop], handler, rel)
    },
    apply(_, thisArg, args) {
      return parentHandler(args.length ? args : null)
    }
  })

  storeHelpers.relationship = relProxy.bind(null, typeInit)

  storeHelpers.queryRelationship = (key, targetType, ids) => ({
    *[Symbol.iterator]() {
      const { [key]: entries } = relationships
      const passed = new Set
      for (const x of (ids ?? Object.values(entries))) {
        for (const item of ids
          ? entries[x]?.[targetType] ?? []
          : x[targetType]
        ) {
          if (!passed.has(item)) {
            passed.add(item)
            yield item
          }
        }
      }
    }
  })

  // storeHelpers.queryRelationship = (targetType, ...ids) => {
  //   // const result = new Set
  //   const { activeDocuments } = relationships
  //   const targets = ids.length
  //     ? ids.map(id => activeDocuments[id]?.[targetType])
  //     : Object.values(activeDocuments).map(r => r[targetType])

  //   return { [Symbol.iterator]: mergeSetsLazyIterator.bind(null, targets) } // targets
  // }

  const updateRelatedModel = ($, current, next, { add, remove }) => {
    const id = $[documentId]
    const revId = $[revisionId]
    if (next instanceof Set) {
      if (current == null) {
        add(id, ...next)
        return next
      }
      const diff = new Set(next)
      for (const i of current) {
        if (current.has(i)) diff.delete(i)
        else remove(id, i)
      }
      current.add(id, ...diff)
    } else if (current !== next) {
      current ?? remove(id, current)
      next ?? add(id, next)
    }
    return next
  }

  const setOwn = (name, value) => {
    if (validatedModel[isArchived]) {
      // remove
      return
    }
    const foreignKeyMatch = validatedModel[name]
    if (validatedModel[isPublished]) {
      const document = activeDocuments[validatedModel[documentId]] = activeDocuments[validatedModel[documentId]] ?? {}
      document[name] = foreignKeyMatch
        ? updateRelatedModel(validatedModel, document[name], value, foreignKeyMatch)
        : value
    }
    const revision = documentsByRevision[validatedModel[revisionId]] = documentsByRevision[validatedModel[revisionId]] ?? {}
    revision[name] = value
    if (foreignKeyMatch) {
      value instanceof Set
        ? foreignKeyMatch.update(validatedModel[revisionId], ...value)
        : foreignKeyMatch.update(validatedModel[revisionId], value)
    }
  }

  const relHandler = fn => {
    const [init, set, finalize] = fn()
    initializer.push(init)
    finalizer.push(finalize)
    return set
  }

  const relationshipMethods = {
    hasOne(def, relationKey) {
      if (relationKey == null) {
        throw Error("Relation key is required on 'hasOne' relationships!")
      }
      const [name, model] = Object.entries(def)[0]
      Object.defineProperty(typeInit, name, { value: model, enumerable: true })
      // schema[name] = allRelationships[model[nameSymbol]].schema
      getOrSetDefault(inverseRelations, type, createEmptyObject)[name] = [model[nameSymbol], relationKey]
      getOrSetDefault(inverseRelations, model[nameSymbol], createEmptyObject)[relationKey] = [type, name]
      store[model[nameSymbol]].addRelation(relationKey, {
        add(documentId, ...ids) {
          for (const id of ids) {
            const document = activeDocuments[id] = activeDocuments[id] || {}
            document[name] = documentId
          }
        },
        remove(documentId, ...ids) {
          for (const id of ids) {
            // document = activeDocuments[id] = activeDocuments[id] || {}
            // document[name] = null
            activeDocuments[id][name] = null
          }
        },
        update(revisionId, ...ids) {
          for (const id of ids) {
            const document = revisionsByDocument[id] = revisionsByDocument[id] || {}
            const set = document[name] = document[name] ?? new Set
            set.add(revisionId)
          }
        },
        validate($, id) {
          const prev = activeDocuments[id]?.[name]
          if (prev != null && prev !== $[documentId]) {
            throw Error(`Cannot assign multiple ${name}s to ${type}`)
          }
        }
      })
    },
    hasMany(def, relationKey) {
      if (relationKey == null) {
        throw Error("Relation key is required on 'hasMany' relationships!")
      }
      const [name, model] = Object.entries(def)[0]
      getOrSetDefault(inverseRelations, type, createEmptyObject)[name] = [model[nameSymbol], relationKey, true]
      getOrSetDefault(inverseRelations, model[nameSymbol], createEmptyObject)[relationKey] = [type, name, false]
      Object.defineProperty(typeInit, name, { value: model, enumerable: true })
      // schema[name] = allRelationships[model[nameSymbol]].schema
      store[model[nameSymbol]].addRelation(relationKey, {
        add(documentId, ...ids) {
          for (const id of ids) {
            const document = activeDocuments[id] = activeDocuments[id] || {}
            const set = document[name] = document[name] ?? new Set
            set.add(documentId)
          }
        },
        remove(documentId, ...ids) {
          for (const id of ids) {
            // document = activeDocuments[id] = activeDocuments[id] || {}
            // const set = document[name] ?? new Set
            // set.delete(documentId)
            activeDocuments[id][name].delete(documentId)
          }
        },
        update(revisionId, ...ids) {
          for (const id of ids) {
            const document = revisionsByDocument[id] = revisionsByDocument[id] || {}
            const set = document[name] = document[name] ?? new Set
            set.add(revisionId)
          }
        }
      })
    },
    belongsToOne(def) {
      const [name, model] = Object.entries(def)[0]
      // schema[name] = allRelationships[model[nameSymbol]].schema
      Object.defineProperty(typeInit, name, { value: model, enumerable: true })
      const set = relHandler(state => [
        () => state = null,
        id => state = id,
        () => setOwn(name, state)
      ])
      return id => {
        const match = store[model[nameSymbol]].hasDocument(id)
        if (!match) {
          throw Error(`Id ${id} does not exist as a ${model[nameSymbol]}`)
        }
        const prev = activeDocuments?.[validatedModel[documentId]]?.[name]
        if (prev != null && prev !== id) {
          throw Error(`Cannot assign multiple ${name}s to ${type}`)
        }
        validatedModel[name]?.validation?.(validatedModel, id)
        // if all validations pass, set id to local state
        set(id)
        return true
      }
    },
    belongsToMany(def) {
      const [name, model] = Object.entries(def)[0]
      // schema[name] = allRelationships[model[nameSymbol]].schema
      Object.defineProperty(typeInit, name, { value: model, enumerable: true })
      const set = relHandler(state => [
        () => state = new Set,
        id => state.add(id),
        () => setOwn(name, state)
      ])
      return id => {
        const match = store[model[nameSymbol]].hasDocument(id)
        if (!match) throw Error(`Id ${id} does not exist as a ${model[nameSymbol]}`)
        set(id)
        return true
      }
    }
  }

  return {
    relationshipMethods,
    relationships: def
  }
}

// Two big tasks ahead:
// 1. Firugre out associations - DONE
// 2. Figure out new type for handling document status: { id: UUID(document), pubished: UUID(revision), archived: Boolean }
// Bonus:
// add assoc related query methods (like include)  - DONE
// assoc includers doc vs revision - DONE (only doc)
// + archived docs in assoc includers - DONE
// + filtering in normal getters
