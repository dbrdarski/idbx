import { ArraySymbol, ObjectSymbol, StringSymbol, NumberSymbol } from './symbols.js'
import { createStore, serializeObject, deserializeObject } from './helpers.js'
import { getType, submatch, encodeInt, decodeInt } from './utils.js'
import { allValuesRegex } from './parser/tokenizer.js'

const getNumberSymbol = (v) => NumberSymbol.fromNumeric(v)

export const arrayStore = createStore({
  SymbolType: ArraySymbol,
  serializer: write => arr => `[${arr.map(matchType(write)).join('')}]`
})

export const objectStore = createStore({
  SymbolType: ObjectSymbol,
  serializer: write => value => {
    const [ keys, values ] = serializeObject(value).map(matchType(write))
    return `{${keys}${values}}`
  }
})

export const stringStore = createStore({
  SymbolType: StringSymbol,
  serializer: _ => JSON.stringify
})

export const allStores = {
  arrayStore,
  objectStore,
  stringStore
}

const getBasicTokenValue = (token) => {
  switch (token) {
    case 'T':
      return true
    case 'F':
      return false
    case 'V':
      return null
  }
}

export const matchToken = write => ({ token, type, matches }) => {
  switch (type) {
    case 'basic':
      return getBasicTokenValue(token)
    case 'number':
      return getNumberSymbol(token)
    case 'string':
      const key = stringStore.getKey(write)(JSON.parse(token))
      stringStore.getValue(key)
      return token
    case 'array': {
      const value = submatch(token, allValuesRegex).map(parseToken)
      // value.map(JSON.stringify).map(console.log)
      const key = arrayStore.getKey(write)(value)
      arrayStore.getValue(key)
      return value
    }
    case 'object': {
      // console.log({ matches })
      const [ shape, values ] = matches.map(parseToken)
      // console.log('O:', shape, values)
      const value = deserializeObject(shape, values)
      objectStore.getKey(write)(value)
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
    case 'T':
    case 'F':
    case 'V':
      return getBasicTokenValue(token)
    case 'N':
      return Number(decodeInt(token.substring(1)))
    case 'O':
      return objectStore.getValue(token)
    case 'A':
      return arrayStore.getValue(token)
    case 'S':
      return stringStore.getValue(token)
  }
}

export const matchType = write => value => {
  const type = getType(value)
  switch (type) {
    case 'void':
      return 'V'
    case 'boolean':
      return value ? 'T' : 'F'
    case 'number':
      return getNumberSymbol(value)
    case 'string':
      return stringStore.getKey(write)(value)
    case 'array':
      return arrayStore.getKey(write)(value)
    case 'object':
      return objectStore.getKey(write)(value)
  }
}
