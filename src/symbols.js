import { encodeInt, decodeInt } from './utils.js'

export class TypeSymbol extends String {
  static fromNumeric (x) {
    return new this(encodeInt(x))
  }
  toBigInt (x) {
    return decodeInt(this)
  }
  toNumber (x) {
    return Number(decodeInt(this))
  }
}

export class NumberSymbol extends TypeSymbol {
  toString () {
    return `N${this.valueOf()}`
  }
}

export class ArraySymbol extends TypeSymbol {
  toString () {
    return `A${this.valueOf()}`
  }
}

export class ObjectSymbol extends TypeSymbol {
  toString () {
    return `O${this.valueOf()}`
  }
}

export class StringSymbol extends TypeSymbol {
  toString () {
    return `S${this.valueOf()}`
  }
}
