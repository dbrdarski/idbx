import { ArraySymbol, ObjectSymbol, StringSymbol, NumberSymbol, RecordSymbol } from "./symbols.js"
import { createStore, serializeObject, deserializeObject } from "./helpers.js"
import { getType, submatch, encodeInt, decodeInt } from "./utils.js"
import { allValuesRegex } from "./parser/tokenizer.js"

const getNumberSymbol = (v) => NumberSymbol.fromNumeric(v)

export const initDocument = () => {
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

  const recordStore = createStore({
    SymbolType: RecordSymbol,
    handler (value, index) {
      value.meta = {
        id: index.toString(),
        ...value.meta
      }
      return value
    },
    serializer: write => (value) => {
      const data = matchType(write)(value.data)
      const meta = matchType(write)(value.meta)
      console.log({ data, meta })
      console.log({ data: data.toString(), meta: meta.toString() })
      // const [ data, meta ] = serializeObject(value).map(matchType(write))
      return `(${data}${meta})`
    }
  })

  const allStores = {
    stringStore,
    arrayStore,
    objectStore,
    recordStore
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
      case "number":
        return getNumberSymbol(token)
      case "string":
        const key = stringStore.getKey(write)(JSON.parse(token))
        stringStore.getValue(key)
        return token
      case "array": {
        const value = submatch(token, allValuesRegex).map(parseToken)
        // value.map(JSON.stringify).map(console.log)
        const key = arrayStore.getKey(write)(value)
        arrayStore.getValue(key)
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
        const [ data, meta /* , prev */ ] = matches.map(parseToken)
        const value = { data, meta /* , prev */ }
        recordStore.getKey(write)(value)
        return value
      }
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
        return Number(decodeInt(token.substring(1)))
      case "S":
        return stringStore.getValue(token)
      case "A":
        return arrayStore.getValue(token)
      case "O":
        return objectStore.getValue(token)
      case "R":
        return recordStore.getValue(token)
    }
  }

  const matchType = write => value => {
    const type = getType(value)
    switch (type) {
      case "void":
        return "V"
      case "boolean":
        return value ? "T" : "F"
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

  return {
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
