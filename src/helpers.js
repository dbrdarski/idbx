import { noop } from "./utils.js"

export const createStore = ({ SymbolType, serializer, handler, match }) => store(SymbolType, serializer, handler, match)

// inheritFromStore may be removed
// match may be removed
const store = (SymbolType, serializer, handler, match = true, inheritFromStore = {}) => {
  const values = Object.create(inheritFromStore.values || null)
  const keys = match
    ? Object.create(inheritFromStore.keys || null)
    : null
  let counter = 0n
  return {
    fork: () => store(SymbolType, serializer, handler, match, inheritFromStore = { keys, values }),
    getValue: key => values[key],
    getKey: write => value => {
      value = (handler && write !== noop) ? handler(value) : value
      const str_value = serializer
        ? serializer(write)(value, match ? undefined : counter++)
        : value
      if (!(match && str_value in keys)) {
        write(str_value)
        const key = SymbolType ? SymbolType.fromBigInt(counter) : counter
        if (match) {
          counter++
          keys[str_value] = key
        }
        values[key] = value
        return key
      }
      return keys[str_value]
    },
    print (mapper) {
      console.log(mapper ? mapper(keys) : keys)
      console.log(mapper ? mapper(values) : values)
    }
  }
}

export const serializeObject = o => [ Object.keys(o), Object.values(o) ]
export const deserializeObject = (keys, values) => {
  const o = {}
  keys.forEach((key, index) => {
    o[key] = values[index]
  })
  return o
}


const UUIDs = new Set

export const generateUUID = () => {
  const id = crypto.randomUUID()
  if (UUIDs.has(id)) {
    return generateUUID()
  }
  UUIDs.add(id)
  return id
}

// export const getRecordId = counter => Number(counter) + 1
