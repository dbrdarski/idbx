import { encodeInt, decodeInt, encodeFloat } from "./utils.js"

export class TypeSymbol extends String {
  static fromNumeric (x) {
    return new this(encodeFloat(x))
  }
  static fromBigInt (x) {
    return new this(encodeInt(x))
  }
  toBigInt () {
    return decodeInt(this.valueOf())
  }
  toNumber () {
    return Number(decodeInt(this.valueOf()))
  }
}

export class IntegerSymbol extends TypeSymbol {}
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

export class RecordSymbol extends TypeSymbol {
  toString () {
    return `R${this.valueOf()}`
  }
}

export class DocumentSymbol extends TypeSymbol {
  toString () {
    return `D${this.valueOf()}`
  }
}
