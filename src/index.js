// import { appendFile } from 'fs'
import { ArraySymbol, ObjectSymbol, NumberSymbol, StringSymbol } from './symbols.js'
import { objectStore, arrayStore, stringStore, matchType } from './stores.js'

// const regex = /[NAOS][^\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\\]\^\_\`abcdefghijklmnopqrstuvwxyz\{\|\}~ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]*/

const getNumberValue = (v) => NumberSymbol.toNumber(v)

export const write = (output = []) => (value) => output.push(value)

export const match = (value) => {
  const output = []
  const writter = write(output)
  const m = matchType(writter)(value)
  return [m, output]
}

export const read = (symbol) => {
  switch (symbol.constructor) {
    case NumberSymbol:
      return getNumberValue(symbol)
    case StringSymbol:
      return stringStore.getValue(symbol)
    case ArraySymbol:
      return arrayStore.getValue(symbol)
    case ObjectSymbol:
      return objectStore.getValue(symbol)
  }
}
