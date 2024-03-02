import { nameSymbol } from "./utils.js"

// TODO: Add relStore as injected dependency
// export createRelStore = () => new Map()

const applyContext = context => fn => fn.call(context)
const apply = fn => fn()
// const getOrSetDefault = (target, key, defaultValue) => {
//   if (!target.hasOwnProperty(key)) {
//     target[key] = defaultValue
//     return defaultValue
//   }
//   return target[key]
// }
// const isModel = Symbol("isModel")
const noop = () => { }

const isPublished = Symbol("isPublished")
const isArchived = Symbol("isArchived")
const documentId = Symbol("documentId")
const revisionId = Symbol("revisionId")

const allRelationships = {}
const relStore = new Map()

export const setter = (includes, rel) => {
  const path = includes[rel] = includes[rel] || {}
  return item => path[item.document.id] = item
}

export const includeProxy = includes => {
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

export const createIncluder = (relStore, recorder, typeInit, type) =>
  (handler, includes) => {
    return handler(includeProxy(includes), modelProxy(relStore, recorder, typeInit, includes, type))
  }


export const modelProxy = (relStore, recorder, model, includes, parentName, parentRel) => {
  const proxy = new Proxy(noop, {
    get(_, prop) {
      if (!prop in model) {
        console.error(
          Error(`Model ${model[nameSymbol]} has no relationship named '${prop}'`)
        )
        return
      }
      const value = model[prop]
      if (!relStore.has(value) && typeof value !== "function") {
        throw Error("Model doesn't exist!!!!!!!!")
      }
      return relStore.has(value)
        ? modelProxy(relStore, recorder, value, includes, model[nameSymbol], prop) // TODO: think if we need this (relStore) -> type === "function"
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

export const createOwnSetter = ({ activeDocuments, documentsByRevision }, getValidatedModel) =>
  (name, value) => {
    const validatedModel = getValidatedModel()
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

export const updateRelatedModel = ($, current, next, { add, remove }) => {
  const id = $[documentId]
  // const revId = $[revisionId]
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

export const createRecorder = allRelationships =>
  (set, rel, type, parentName, handler, id) => {
    const connections = allRelationships[parentName].activeDocuments[id]?.[rel]
    if (connections == null) return // TODO: investigate connections.length
    for (const record of store[type]?.getActiveDocuments(...connections)) {
      set(record)
      handler?.(record.document.id)
    }
  }

export const createModelValidator = () => {
  let validatedModel = null
  const initializer = []
  const finalizer = []
  const validatorPrototype = {}

  const relHandler = fn => {
    const [init, set, finalize] = fn()
    initializer.push(init)
    finalizer.push(finalize)
    return set
  }

  const addRelation = (name, methods) => {
    validatorPrototype[name] = methods
  }

  const selectModel = (docId, revId, active, archived = false) => {
    validatedModel = Object.create(validatorPrototype, {
      [isPublished]: { value: active },
      [isArchived]: { value: archived },
      [documentId]: { value: docId },
      [revisionId]: { value: revId }
      // [rel]: { value: {} }
    })
    initializer.forEach(applyContext(validatedModel))
  }

  const releaseModel = () => {
    finalizer.forEach(applyContext(validatedModel))
    validatedModel = null
  }

  const getValidatedModel = () => validatedModel

  return {
    relHandler,
    getValidatedModel,
    addRelation,
    selectModel,
    releaseModel
  }
}

export const createRelationshipMethods = (store, typeInit, { activeDocuments, revisionsByDocument }, getValidatedModel, relHandler, setOwn) => ({
  hasOne(def, relationKey) {
    if (relationKey == null) {
      throw Error("Relation key is required on 'hasOne' relationships!")
    }
    const [name, model] = Object.entries(def)[0]
    Object.defineProperty(typeInit, name, { value: model, enumerable: true })
    // schema[name] = allRelationships[model[nameSymbol]].schema
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
      const validatedModel = getValidatedModel()
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
})





/* Main part */

export const generateRelations = (context, store, methods, type, typeInit, def) => {
  const modelSchema = {
    type,
    model: typeInit,
    relations: {},
    handlers: {}
  }

  relStore.set(typeInit, modelSchema)

  const storeHelpers = store[type]
  const relationships = allRelationships[type] = {}

  // activeDocuments aka active
  const activeDocuments = relationships.activeDocuments = {}
  const documentsByRevision = relationships.documentsByRevision = {}
  const revisionsByDocument = relationships.revisionsByDocument = {}
  const schema = relationships.schema = {
    [nameSymbol]: type
  }

  const recorder = createRecorder(allRelationships)
  storeHelpers.include = createIncluder(relStore, recorder, typeInit, typeInit[nameSymbol])

  const {
    relHandler,
    getValidatedModel,
    addRelation,
    selectModel,
    releaseModel
  } = createModelValidator()

  Object.assign(storeHelpers, {
    addRelation,
    selectModel,
    releaseModel
  })

  const setOwn = createOwnSetter(relationships, getValidatedModel)

  storeHelpers.queryRelationship = (type, ...ids) => {
    console.log(type, JSON.stringify(allRelationships[type], null, 2))
    console.log(ids)
    return { allRelationships, [type]: allRelationships[type].activeDocuments }
  }

  const relationshipMethods = createRelationshipMethods(store, typeInit, relationships, getValidatedModel, relHandler, setOwn)
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
// assoc filtering doc vs revision - DONE (only doc)
// + archived docs in assoc filtering - DONE
// + filtering in normal getters
