// import { StringSymbol, ArraySymbol, ObjectSymbol, RecordSymbol, NumberSymbol } from "./symbols.js"
// import { stringStore, arrayStore, objectStore, recordStore, matchType } from "./stores.js"
//
// const getNumberValue = (v) => NumberSymbol.toNumber(v)
//
// export const write = (output = []) => (value) => output.push(value)
//
// export const match = (value) => {
//   const output = []
//   const writter = write(output)
//   const m = matchType(writter)(value)
//   return [m, output]
// }
//
// export const read = (symbol) => {
//   switch (symbol.constructor) {
//     case NumberSymbol:
//       return getNumberValue(symbol)
//     case StringSymbol:
//       return stringStore.getValue(symbol)
//     case ArraySymbol:
//       return arrayStore.getValue(symbol)
//     case ObjectSymbol:
//       return objectStore.getValue(symbol)
//     case RecordSymbol:
//       return recordStore.getValue(symbol)
//   }
// }
