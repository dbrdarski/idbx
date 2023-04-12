const apply = context => fn => fn.call(context)
// const getOrSetDefault = (target, key, defaultValue) => {
//   if (!target.hasOwnProperty(key)) {
//     target[key] = defaultValue
//     return defaultValue
//   }
//   return target[key]
// }

const isPublished = Symbol('isPublished')
const isArchived = Symbol('isArchived')
const documentId = Symbol('documentId')
const revisionId = Symbol('revisionId')
const rel = Symbol('rel')

const allRelationships = globalThis.relationships = {}

export const generateRelations = (context, store, methods, type, typeInit, def) => {

  const storeHelpers = store[type]
  const relationships = allRelationships[type] = {}

  // activeDocuments aka active
  const activeDocuments = relationships.activeDocuments = {}
  const documentsByRevision = relationships.documentsByRevision = {}
  const revisionsByDocument = relationships.revisionsByDocument = {}

  let validatedModel = null

  const initializer = []
  const finalizer = []
  const validatorPrototype = {}

  storeHelpers.include = (includes, relations) => {
    for (const rel of relations) {
      includes[rel] = new Set
    }
    return item => {
      console.log({ relations, activeDocuments })
      for (const rel of relations) {
        const connections = activeDocuments[item]?.[rel]
        console.log({ connections })
        if (connections == null) continue
        for (const c of store[rel]?.getActiveDocuments(...connections)) {
          includes[rel].add(c)
        }
      }
      return item
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
      store[model.name].addRelation(relationKey, {
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
      store[model.name].addRelation(relationKey, {
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
      const set = relHandler(state => [
        () => state = null,
        id => state = id,
        () => setOwn(name, state)
      ])
      return id => {
        const match = store[model.name].hasDocument(id)
        if (!match) {
          throw Error(`Id ${id} does not exist as a ${model.name}`)
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
      const set = relHandler(state => [
        () => state = new Set,
        id => state.add(id),
        () => setOwn(name, state)
      ])
      return id => {
        const match = store[model.name].hasDocument(id)
        if (!match) throw Error(`Id ${id} does not exist as a ${model.name}`)
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
