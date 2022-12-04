const apply = context => fn => fn.call(context)
const getOrSetDefault = (target, key, defaultValue) => {
  if (!target.hasOwnProperty(key)) {
    target[key] = defaultValue
    return defaultValue
  }
  return target[key]
}

const isPublished = Symbol('isPublished')
const isArchived = Symbol('isArchived')
const documentId = Symbol('documentId')
const revisionId = Symbol('revisionId')
const rel = Symbol('rel')

export const generateRelations = (context, store, methods, type, typeInit, def) => {

  const storeHelpers = store[type]

  const foreignKeys = {}
  const ownKeys = {}
  const revisions = ownKeys.revisions = {}
  // documents aka active
  const documents = ownKeys.documents = {}

  // let initializedModel = null
  let validatedModel = null

  const initializer = []
  const finalizer = []
  const validatorPrototype = {}

  storeHelpers.addRelation = (name, methods) => {
    validatorPrototype[name] = methods
  }
  // const instance = Object.create(validatorPrototype)

  const updateRelatedModel = ($, current, next, { add, remove }) => {
    const id = $[documentId]
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
    if (validatedModel[isPublished]) {
      document = documents[validatedModel[documentId]] = documents[validatedModel[documentId]] ?? {}
      document[name] = validatedModel.hasOwnProperty(name)
        ? updateRelatedModel(validatedModel, document[name], value, validatedModel[name])
        : value
    }
    const revision = revisions[validatedModel[revisionId]] = revisions[validatedModel[revisionId]] ?? {}
    revision[name] = value
  }

  storeHelpers.selectModel = (docId, revId, active, archived = false) => {
    validatedModel = Object.create(validatorPrototype, {
      [isPublished]: { value: active },
      [isArchived]: { value: archived },
      [documentId]: { value: documentId },
      [revisionId]: { value: revisionId },
      [rel]: { value: {} }
    })
    initializer.forEach(apply(validatedModel))
  }

  storeHelpers.releaseModel = () => {
    finalizer.forEach(apply(validatedModel))
    validatedModel = null
  }

  const relHandler = fn => {
    const [ init, set, finalize ] = fn()
    initializer.push(init)
    finalizer.push(finalize)
    return set
  }

  const relationshipMethods = {
    hasOne (def, relationKey) {
      const [ name, model ] = Object.entries(def)[0]
      store[model.name].addRelation(relationKey, {
        add (documentId, ...ids) {
          for (const id of ids) {
            document = documents[id] = documents[id] || {}
            document[name] = documentId
          }
        },
        remove (documentId, ...ids) {
          for (const id of ids) {
            // document = documents[id] = documents[id] || {}
            // document[name] = null
            documents[id][name] = null
          }
        },
        validate ($, id) {
          const prev = documents[id]?.[name]
          if (prev != null && prev !== $[documentId]) {
            throw Error(`Cannot assign multiple ${name}s to ${type}`)
          }
        }
      })
    },
    hasMany (def, relationKey) {
      const [ name, model ] = Object.entries(def)[0]
      store[model.name].addRelation(relationKey, {
        add (documentId, ...ids) {
          for (const id of ids) {
            document = documents[id] = documents[id] || {}
            const set = document[name] ?? new Set
            set.add(document)
          }
        },
        remove (documentId, ...ids) {
          for (const id of ids) {
            // document = documents[id] = documents[id] || {}
            // const set = document[name] ?? new Set
            // set.delete(documentId)
            documents[id][name].delete(documentId)
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
          console.log({ match })
          throw Error(`Id ${id} does not exist as a ${model.name}`)
        }
        const prev = documents?.[validatedModel[documentId]]?.[name]
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
