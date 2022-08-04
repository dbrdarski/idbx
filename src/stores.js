import { ArraySymbol, ObjectSymbol, StringSymbol, NumberSymbol, IntegerSymbol, RecordSymbol, DocumentSymbol } from "./symbols.js"
import { createStore, serializeObject, deserializeObject, generateUUID } from "./helpers.js"
import { getType, submatch, encodeInt, decodeInt, encodeFloat, decodeFloat } from "./utils.js"
import { allValuesRegex } from "./parser/tokenizer.js"

const getNumberSymbol = (v) => NumberSymbol.fromNumeric(v)
const getIntegerSymbol = (v) => `${v < 0 ? '-' : '+'}${IntegerSymbol.fromBigInt(v < 0 ? -1n * v : v)}`

/*
Notes:
  Records/revisions should contain link to previous record (as meta)
  ? Records should link to Taxonomy (ex: Page)
  Taxonomy should consist of two parts:
    1. Definition - which defines TYPE and ID for a taxonomy (unique record)
    2. Taxonomy entries - consisting of ID and LINK(s) to Record(s). Each new entry overrides the previos ones.
      ? Should there be multiple links per taxonomy?
*/

/*

Primitive Types
===============
  - String,
  - Number(float),
  - BigInt(integer),
  - Boolean(true, false),
  - Void(null, undefined),
  - Array(Tuple),
  - Object(Record),
  - Link(Box),
  - Others(Regex, Date...)

Referential Types
=================
  - Document (Symbol-like unique ID)

Compound Types (Structured types)
=================================
  - Taxonomy {
      name: String(unique),
      definition
    },
  - Publication {
    @belongsToOne Document
      head: Link(Revision),
      tail: Link(Publication)
    },
  - Revision (currently: Record) {
    @belongsToOne Document
      type: String(taxonomy::name)
      from: Link(Revision),
      body: Link(
        data @implements Taxonomy instance
      )
    }
*/

export const initDocument = () => {
  // const identifierStore = createStore({
  //   SymbolType: IdentifierSymbol,
  //   serializer: _ => JSON.stringify
  // })
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
    // handler (type) {
    //   const id = generateUUID()
    //   return { id, type }
    // },
    serializer: write => document => {
      const id = stringStore.getKey(write)(document.id)
      const type = stringStore.getKey(write)(document.type)
      return `<${id}${type}>`
    }
  })

  // const documentStore = createStore({
  //   match: false,
  //   SymbolType: DocumentSymbol,
  //   handler (type, id) {
  //     return { id, type }
  //   },
  //   // <D1>,<D2>,<D3> for now - D1 is link to TaxonomyDefinition, the ID is derived from order (like in everything else!!!!!)
  //   serializer: write => definition => { // (definition, id) -> id is available but not necessary
  //     const definitionID = taxonomyDefinitionStore.getKey(write)(definition) // matchType(write)(value.type)
  //     return `<${definitionID}>`
  //   }
  // })
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
    serializer: write => ({ document, revision, data, meta, archived }) => {
      const documentKey = documentStore.getKey(write)(document)
      const revisionKey = objectStore.getKey(write)(revision)
      const dataKey = objectStore.getKey(write)(data)
      const metaKey = objectStore.getKey(write)(meta)
      const archivedValue = matchType(write)(archived)
      return `(${documentKey}${revisionKey}${dataKey}${metaKey}${archivedValue})`
    }
  })
  // const recordStore = createStore({
  //   SymbolType: RecordSymbol,
  //   handler (value) {
  //     value.meta = {
  //       id: index.toString(),
  //       ...value.meta
  //     }
  //     return value
  //   },
  //   serializer: write => value => {
  //     const data = matchType(write)(value.data)
  //     const meta = matchType(write)(value.meta)
  //     // console.log({ data, meta })
  //     // console.log({ data: data.toString(), meta: meta.toString() })
  //     // const [ data, meta ] = serializeObject(value).map(matchType(write))
  //     return `(${data}${meta})`
  //   }
  // })

  // const taxonomyStore = createStore({
  //   SymbolType: TaxonomySymbol,
  //   serializer: write => value => {
  //     // <S1>,<S2>,<S3> for now - no definition data!!!
  //     const type = stringStore.getKey(write)(value.type) // matchType(write)(value.type)
  //     return `<${type}>`
  //   }
  // })

  // const publicationStore = createStore({
  //   match: false,
  //   SymbolType: PublicationSymbol,
  //   serializer: write => ({ taxonomy_id, record }) => {
  //     // taxonomy is and ID which is already predefined
  //     return `<X${taxonomy_id}${recordStore.getKey(write)(record)}>`
  //   }
  // })
  //
  const allStores = {
    // identifierStore,
    stringStore,
    arrayStore,
    objectStore,
    recordStore,
    documentStore
    // taxonomyDefinitionStore,
    // publicationStore
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
        // stringStore.getValue(key)
        return token
      case "array": {
        const value = submatch(token, allValuesRegex).map(parseToken)
        // value.map(JSON.stringify).map(console.log)
        const key = arrayStore.getKey(write)(value)
        // arrayStore.getValue(key)
        return value
      }
      case "object": {
        // console.log({ matches })
        const [ shape, values ] = matches.map(parseToken)
        // console.log("O:", shape, values)
        const value = deserializeObject(shape, values)
        objectStore.getKey(write)(value)
        return value
      }
      case "record": {
        const [ document, revision, data, meta, archived ] = matches.map(parseToken)
        const value = { document, revision, data, meta, archived }
        recordStore.getKey(write)(value)
        return value
      }
      case "document": {
        const [ id, type ] = matches.map(parseToken)
        const value = { id, type }
        documentStore.getKey(write)(value)
        return value
      }
      // case "identifier":
      //   const key = identifierStore.getKey(write)(JSON.parse(token))
      //   // identifierStore.getValue(key)
      //   return token
      // case "taxonomyDefinition": {
      //   const [ type ] = matches.map(parseToken)
      //   taxonomyDefinitionStore.getKey(write)({ type })
      //   return value
      // }
      // case "publication": {
      //   const [ id, record ] = matches.map(parseToken)
      //   const value = updateTaxonomyDefinition(idRecord)
      //   publicationStore.getKey(write)(value)
      //   return value
      // }
    }
  }

  // const log = (label, fn) => v => {
  //   const val = fn(v);
  //   return val
  // }

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

  const taxonomy = (name) => {
    return {
      // hasOne () {},
      // hasMany () {},
      // belongsTo () {},
      // belongsToMany () {},
      create () {},
      update () {},
      archive () {}
    }
  }

  return {
    // identifierStore,
    stringStore,
    arrayStore,
    objectStore,
    recordStore,
    allStores,
    matchToken,
    matchType,
    addRecord
  }
}
