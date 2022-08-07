import { ArraySymbol, ObjectSymbol, StringSymbol, NumberSymbol, IntegerSymbol, RecordSymbol, DocumentSymbol } from "./symbols.js"
import { createStore, serializeObject, deserializeObject, generateUUID } from "./helpers.js"
import { getType, submatch, encodeInt, decodeInt, encodeFloat, decodeFloat } from "./utils.js"
import { allValuesRegex } from "./parser/tokenizer.js"
import { initIds } from "./ids"

const getNumberSymbol = (v) => NumberSymbol.fromNumeric(v)
const getIntegerSymbol = (v) => `${v < 0 ? '-' : '+'}${IntegerSymbol.fromBigInt(v < 0 ? -1n * v : v)}`

export const initDocument = (init) => {
  const stringStore = createStore({
    SymbolType: StringSymbol,
    serializer: _ => JSON.stringify
  })

  const arrayStore = createStore({
    SymbolType: ArraySymbol,
    serializer: write => arr => `[${arr.map(matchType(write)).join("")}]`
  })

  const objectStore = createStore({
    SymbolType: ObjectSymbol,
    serializer: write => value => {
      const [ keys, values ] = serializeObject(value).map(matchType(write))
      return `{${keys}${values}}`
    }
  })

  const documentStore = createStore({
    SymbolType: DocumentSymbol,
    serializer: write => ({ id, type }) => {
      const idKey = stringStore.getKey(write)(id)
      const typeKey = stringStore.getKey(write)(type)
      ids[type].createDocument(id)
      return `<${idKey}${typeKey}>`
    }
  })

  const recordStore = createStore({
    SymbolType: RecordSymbol,
    handler ({ type, id, data, meta, from, publish = false, archived = false }) {
      if (!id) {
        id = generateUUID()
      }
      const document = { id, type }
      const revision = generateUUID()
      return {
        document,
        revision: {
          id: revision,
          from,
          published: publish ? revision : null,
        },
        meta,
        data,
        archived
      }
    },
    serializer: write => (record) => {
      const { document, revision, data, meta, archived } = record
      const documentKey = documentStore.getKey(write)(document)
      ids[document.type].createRecord(document.id, record)

      const revisionKey = objectStore.getKey(write)(revision)
      const dataKey = objectStore.getKey(write)(data)
      const metaKey = objectStore.getKey(write)(meta)
      const archivedValue = matchType(write)(archived)
      return `(${documentKey}${revisionKey}${dataKey}${metaKey}${archivedValue})`
    }
  })

  const allStores = {
    stringStore,
    arrayStore,
    objectStore,
    recordStore,
    documentStore
  }

  const getBasicTokenValue = (token) => {
    switch (token) {
      case "T":
        return true
      case "F":
        return false
      case "V":
        return null
    }
  }

  const matchToken = write => ({ token, type, matches }) => {
    switch (type) {
      case "basic":
        return getBasicTokenValue(token)
      case "bigint":
          return getIntegerSymbol(token)
      case "number":
        return getNumberSymbol(token)
      case "string":
        const key = stringStore.getKey(write)(JSON.parse(token))
        return token
      case "array": {
        const array = submatch(token, allValuesRegex).map(parseToken)
        const key = arrayStore.getKey(write)(array)
        return array
      }
      case "object": {
        const [ shape, values ] = matches.map(parseToken)
        const object = deserializeObject(shape, values)
        objectStore.getKey(write)(object)
        return object
      }
      case "record": {
        const [ document, revision, data, meta, archived ] = matches.map(parseToken)
        const record = { document, revision, data, meta, archived }
        recordStore.getKey(write)(record)
        return record
      }
      case "document": {
        const [ id, type ] = matches.map(parseToken)
        const document = { id, type }
        documentStore.getKey(write)(document)
        return document
      }
    }
  }

  const parseToken = (token) => {
    switch (token[0]) {
      case "T":
      case "F":
      case "V":
        return getBasicTokenValue(token)
      case "N":
        return decodeFloat(token.substring(1))
      case "+":
        return decodeInt(token.substring(1))
      case "-":
        return -1n * decodeInt(token.substring(1))
      case "S":
        return stringStore.getValue(token)
      case "A":
        return arrayStore.getValue(token)
      case "O":
        return objectStore.getValue(token)
      case "R":
        return recordStore.getValue(token)
      case "D":
        return documentStore.getValue(token)
    }
  }

  const matchType = write => value => {
    const type = getType(value)
    switch (type) {
      case "void":
        return "V"
      case "boolean":
        return value ? "T" : "F"
      case "bigint":
        return getIntegerSymbol(value)
      case "number":
        return getNumberSymbol(value)
      case "string":
        return stringStore.getKey(write)(value)
      case "array":
        return arrayStore.getKey(write)(value)
      case "object":
        return objectStore.getKey(write)(value)
    }
  }

  const addRecord = write => value => recordStore.getKey(write)(value)
  const { ids, getters, generateType } = initIds(init)
  init(generateType)

  // const taxonomy = (name, schema, relations) => {}

  // const Post = taxonomy(
  //   ({ hasOne, belongsTo }) => ({
  //     head: {
  //       title: String,
  //       slug: String
  //     },
  //     body: Object
  //   })
  // )
  //
  // const taxonomy = (name) => {
  //   return {
  //     // hasOne () {},
  //     // hasMany () {},
  //     // belongsTo () {},
  //     // belongsToMany () {},
  //     create () {},
  //     update () {},
  //     archive () {}
  //   }
  // }

  return {
    stringStore,
    arrayStore,
    objectStore,
    recordStore,
    allStores,
    matchToken,
    matchType,
    addRecord,
    getters
  }
}
