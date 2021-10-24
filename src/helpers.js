export const createStore = ({ SymbolType, serializer, handler }) => store(SymbolType, serializer, handler)

const store = (SymbolType, serializer, handler, inheritFromStore = {}) => {
  const values = Object.create(inheritFromStore.values || null)
  const keys = Object.create(inheritFromStore.keys || null)
  let counter = 0n
  return {
    fork: () => store(SymbolType, serializer, handler, inheritFromStore = { keys, values }),
    getValue: key => values[key],
    getKey: write => (value, isRecord) => {
      const str_value = serializer
        ? serializer(write)(value)
        : value
      if (!(str_value in keys)) {
        write(str_value)
        const key = keys[str_value] = SymbolType.fromNumeric(counter++)
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
