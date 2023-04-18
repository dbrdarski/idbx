import { nameSymbol } from "./utils.js"

const apply = context => fn => fn.call(context)
// const getOrSetDefault = (target, key, defaultValue) => {
//   if (!target.hasOwnProperty(key)) {
//     target[key] = defaultValue
//     return defaultValue
//   }
//   return target[key]
// }

const connector = model => new Proxy({
  get (target, prop) {
    if (target.hasOwnProperty(prop)) {
      return connector(target[prop])
    }
    throw Error(`Model ${model[nameSymbol]} has no relationship named '${prop}'`)
  },
  apply (target, thisArg, args) {
    return target.apply(thisArg, args)
  }
})

const isPublished = Symbol('isPublished')
const isArchived = Symbol('isArchived')
const documentId = Symbol('documentId')
const revisionId = Symbol('revisionId')
const rel = Symbol('rel')

const allRelationships = globalThis.relationships = {}
const relStore = new Map()

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

  let validatedModel = null

  const initializer = []
  const finalizer = []
  const validatorPrototype = {}

  storeHelpers.include = (includes, relations) => {
    for (const rel of relations) {
      includes[rel] = {}
    }
    return item => {
      // this logic needs to be tested with hasOne examples
      // it mightm be the case that this is completely fine
      // or that this logic needs to be updated to handle
      // single item connections
      for (const rel of relations) {
        const connections = activeDocuments[item]?.[rel]
        if (connections == null || !connections.length) continue // TODO: investigate connections.length
        const relModelName = schema[rel][nameSymbol]
        for (const record of store[relModelName]?.getActiveDocuments(...connections)) {
          includes[rel][record.document.id] = record
        }
      }
      return item
    }
  }

  const createIncludeHandlers = (includes, relationships) =>
    relationships.map(([ rel, model ]) => {
      includes[rel] = includes[rel] || {}
      const children = relStore.has(model)
        ? null
        : includeHandler(model, includes)
      const type = model[nameSymbol]
      return item => {
        const connections = allRelationships[type][item]?.[rel]
        if (connections == null || !connections.length) return // TODO: investigate connections.length
        for (const record of store[type]?.getActiveDocuments(...connections)) {
          includes[rel][record.document.id] = record
        }
        children?.(record.document.id)
      }
    })

  const includeHandler = (handler, includes, ...modelOrDefault) => {
    const relationships = Object.entries(handler(...modelOrDefault))
    const handlers = createIncludeHandlers(includes, relationships)
    return item => {
      for (const insert of handlers) {
        insert(item)
      }
    }
  }

  storeHelpers.include3 = (handler, includes) =>
    includeHandler(handler, null, includes, connector(typeInit))

  storeHelpers.include2 = (includes, handler, children) => {
    const relations = Object.entries(handler(connector(modelInit)))
    for (const [ rel, model ] of relations) {
      includes[rel] = includes[rel] || {}
      relStore.has(model)
    }
    return item => {
      // this logic needs to be tested with hasOne examples
      // it mightm be the case that this is completely fine
      // or that this logic needs to be updated to handle
      // single item connections
      for (const [ rel, model ] of relations) {
        const connections = activeDocuments[item]?.[rel]
        if (connections == null || !connections.length) continue // TODO: investigate connections.length
        const relModelName = schema[rel][nameSymbol]
        for (const record of store[relModelName]?.getActiveDocuments(...connections)) {
          includes[rel][record.document.id] = record
        }
        handler?.(record.document.id)
      }
      // return item // TODO: see if commenting out this breaks existing logic
    }
  }

  storeHelpers.addRelation = (name, methods) => {
    validatorPrototype[name] = methods
  }

  storeHelpers.selectModel = (docId, revId, active, archived = false) => {
    validatedModel = Object.create(validatorPrototype, {
      [isPublished]: { value: active },
      [isArchived]: { value: archived },
      [documentId]: { value: docId },
      [revisionId]: { value: revId }
      // [rel]: { value: {} }
    })
    initializer.forEach(apply(validatedModel))
  }

  storeHelpers.releaseModel = () => {
    finalizer.forEach(apply(validatedModel))
    validatedModel = null
  }

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
    const [ init, set, finalize ] = fn()
    initializer.push(init)
    finalizer.push(finalize)
    return set
  }

  const relationshipMethods = {
    hasOne (def, relationKey) {
      if (relationKey == null) {
        throw Error("Relation key is required on 'hasOne' relationships!")
      }
      const [ name, model ] = Object.entries(def)[0]
      Object.defineProperty(typeInit, name, { value: model, enumerable: true })
      // schema[name] = allRelationships[model[nameSymbol]].schema
      store[model[nameSymbol]].addRelation(relationKey, {
        add (documentId, ...ids) {
          for (const id of ids) {
            const document = activeDocuments[id] = activeDocuments[id] || {}
            document[name] = documentId
          }
        },
        remove (documentId, ...ids) {
          for (const id of ids) {
            // document = activeDocuments[id] = activeDocuments[id] || {}
            // document[name] = null
            activeDocuments[id][name] = null
          }
        },
        update (revisionId, ...ids) {
          for (const id of ids) {
            const document = revisionsByDocument[id] = revisionsByDocument[id] || {}
            const set = document[name] = document[name] ?? new Set
            set.add(revisionId)
          }
        },
        validate ($, id) {
          const prev = activeDocuments[id]?.[name]
          if (prev != null && prev !== $[documentId]) {
            throw Error(`Cannot assign multiple ${name}s to ${type}`)
          }
        }
      })
    },
    hasMany (def, relationKey) {
      if (relationKey == null) {
        throw Error("Relation key is required on 'hasMany' relationships!")
      }
      const [ name, model ] = Object.entries(def)[0]
      Object.defineProperty(typeInit, name, { value: model, enumerable: true })
      // schema[name] = allRelationships[model[nameSymbol]].schema
      store[model[nameSymbol]].addRelation(relationKey, {
        add (documentId, ...ids) {
          for (const id of ids) {
            const document = activeDocuments[id] = activeDocuments[id] || {}
            const set = document[name] = document[name] ?? new Set
            set.add(documentId)
          }
        },
        remove (documentId, ...ids) {
          for (const id of ids) {
            // document = activeDocuments[id] = activeDocuments[id] || {}
            // const set = document[name] ?? new Set
            // set.delete(documentId)
            activeDocuments[id][name].delete(documentId)
          }
        },
        update (revisionId, ...ids) {
          for (const id of ids) {
            const document = revisionsByDocument[id] = revisionsByDocument[id] || {}
            const set = document[name] = document[name] ?? new Set
            set.add(revisionId)
          }
        }
      })
    },
    belongsToOne (def) {
      const [ name, model ] = Object.entries(def)[0]
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
    belongsToMany (def) {
      const [ name, model ] = Object.entries(def)[0]
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
// 1. Firugre out associations
// 2. Figure out new type for handling document status: { id: UUID(document), pubished: UUID(revision), archived: Boolean }
// Bonus:
// add assoc related query methods (like include)
// assoc filtering doc vs revision
// + archived docs in assoc filtering
// + filtering in normal getters
