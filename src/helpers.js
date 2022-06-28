export const createStore = ({ SymbolType, serializer, handler, match }) => store(SymbolType, serializer, handler, match)

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
      const str_value = serializer
        ? serializer(write)(value, match ? void 0 : counter++)
        : value
      if (!(match && str_value in keys)) {
        write(str_value)
        const key = SymbolType ? SymbolType.fromNumeric(counter) : counter
        if (match) {
          counter++
          keys[str_value] = key
        }
        values[key] = handler
          ? handler(value, counter)
          : value
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

// export const getRecordId = counter => Number(counter) + 1
