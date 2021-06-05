export const createStore = ({ SymbolType, serializer }) => store(SymbolType, serializer)

const store = (SymbolType, serializer, inheritFromStore = {}) => {
  const values = Object.create(inheritFromStore.values || null)
  const keys = Object.create(inheritFromStore.keys || null)
  let counter = 0n
  return {
    fork: () => store(SymbolType, serializer, inheritFromStore = { keys, values }),
    getValue: key => values[key],
    getKey: write => value => {
      const str_value = serializer
        ? serializer(write)(value)
        : value
      if (!(str_value in keys)) {
        write(str_value)
        const key = keys[str_value] = SymbolType.fromNumeric(counter++)
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

// export const getFilenames = (name, path) => {
//   const documentPath = `${path}/${name}`
//   const documentSettings = `${documentPath}/settings.db`
//   const recordsFile = `${documentPath}/records.idb`
//   const indexFile = `${documentPath}/index.idx`
//   return { documentPath, recordsFile, indexFile }
// }

// export const mapShapeKeysFactory = ([ getRecord, getIndex ]) => shape => {
//   shape.map(getIndex)
// }

// export const shapeFactory = (stringStore) => {
//   const [ getRecord, getIndex ] = stringStore
//   return {
//     serializeObjectShape: (shape) => shape.map(pipe2(getIndex, encodeInt)).join(',')
//   }
// }

// const serializeObjectShape = shape => `{${shape.join(',')}}`
