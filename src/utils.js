export function noop () {}
export const id = id => id
export const define = (target, key, value) => Object.defineProperty(target, key, {
  value,
  enumerable: true
})

export const pipe2 = (x, y) => z => y(x(z))
export const pipe = (...fns) => fns.reduce(pipe2)

const mapToReduce = fn => (acc, v) => fn(v)

const divrem = (a, b) => [ a / b, a % b ]
const sum = (a, b) => a + b
const inc = sum.bind(null, 1n)

export const getType = (v) => v == null
  ? 'void'
  : Array.isArray(v)
    ? 'array'
    : typeof v


const intSerializer = (radix, offset) => [
  int => {
    int = BigInt(int)
    let rem = 0n
    // let output = []
    let str = ''
    do {
      [ int, rem ] = divrem(int, radix)
      str += String.fromCharCode(Number(rem + offset))
      // output.push(rem)
    } while (int !== 0n)
    return str
  },
  str => {
    let num = 0n
    for (let i = 0; i < str.length; i++) {
      num += (radix ** BigInt(i)) * (BigInt(str.charCodeAt(i)) - offset)
    }
    return num
  }
]

const hashSerializer = (radix) => [
  int => {
    int = BigInt(int)
    let rem = 0n
    let str = ''
    while (int !== 0n) {
      [ int, rem ] = divrem(int, radix)
      str += Number(rem).toString(Number(radix))
      // output.push(rem)
    }
    return str
  },
  str => {
    let num = 0n
    for (let i = 0; i < str.length; i++) {
      num += (radix ** BigInt(i)) * (BigInt(parseInt(str[i], Number(radix))))
    }
    return num
  }
]



export const [ encodeInt, decodeInt ] = intSerializer(2n ** 16n - 2n ** 8n, 2n ** 8n)
export const [ encodeHash, decodeHash ] = hashSerializer(16n ** 1n)

export const submatch = (str, regex) => [...str.matchAll(regex)].map(([v]) => v)

export function getVNodeTree (el) {
  switch (el.nodeType) {
    case 1:
      return getVNode (el)
    case 3:
      return el.textContent
    default:
      return null
  }
}

function getVNode (el) {
    const tag = el.tagName.toLowerCase();
    const attrs = {};
    for (attr of el.getAttributeNames()) {
        attrs[attr] = el.getAttributeNode(attr).value
    }
    const children = Array.from(el.childNodes).map(getVNodeTree).filter(x => x != null)
    return { tag, attrs, children }
}

// // const multiply = a => b => a * b
// // const radixConverter = radix => value => [ Math.trunc(value / radix), value % radix ];
// // const builder = radix => arr => arr.reduce((acc, value, index) => radix ** index * value + acc)
//
// // const normalizer = (converter) => (values) => {
// //   const output = [...values]
// //   let i = 0
// //   let carry = 0
// //   let value
// //   console.log('IN', output)
// //   while (i < output.length || carry) {
// //     [ carry, value ] = converter(carry + (output[i] || 0))
// //     console.log('STEP', carry, value)
// //     output[i++] = value
// //   }
// //   console.log('OUT', output, value)
// //   return output
// // }
// //
// // function convertBase (reader, normalizer, encoder) {
// //   let output = []
// //   while (true) {
// //     const input = reader(...output)
// //     if (input == null) {
// //       return output.map(encoder).join('')
// //     }
// //     console.log({ input })
// //     output = normalizer(input)
// //   }
// // }
// //
// // const hashSerializer = (radix = 16) => [
// //   (str) => {
// //     let i = 0
// //     return (carry = 0, ...additionals) => {
// //       if (i < str.length) {
// //         return [
// //           carry * radix + parseInt(str.charAt(i++), radix),
// //           ...additionals.map(multiply(radix))
// //         ]
// //       }
// //     }
// //   },
// //   value => value.toString(radix),
// //   radixConverter(radix),
// //   builder(radix)
// // ]
// //
// // const intSerializer = (radix = 2 ** 16, offset = 0) => [
// //   (str) => {
// //     let num = 0
// //     let i = 0
// //     return (carry = 0, ...additionals) => {
// //       if (i < str.length) {
// //         return [
// //           radix * carry + str.charCodeAt(i++) - offset,
// //           ...additionals.map(multiply(radix))
// //         ]
// //       }
// //     }
// //   },
// //   value => String.fromCharCode(value + offset),
// //   radixConverter(radix),
// //   builder(radix)
// // ]
// //
// // const [ hash_encode, hash_decode, hash_convert, hash_builder ] = hashSerializer()
// // const [ int_encode, int_decode, int_convert, int_builder ] = intSerializer(2 ** 16 - 2 ** 8, 2 ** 8)
// //
// // const int2hash = (value) => convertBase(int_encode(value), normalizer(hash_convert), hash_decode)
// // const hash2int = (value) => convertBase(hash_encode(value), normalizer(int_convert), int_decode)
// // function convertBase(reader, encoder, converter) {
// //   let output = []
// //   while (true) {
// //     let [ input ] = reader(carry)
// //     if (input == null) {
// //       return output // .join('')
// //     }
// //     while (input > 0) {
// //       [ input, carry ] = converter(input)
// //       output.push(encoder(input))
// //     }
// //   }
// // }
// //
// // const intSerializer = ({ radix = 2 ** 16, offset = 0 }) => [
// //   function* (int) {
// //     while (int !== 0) {
// //       [ int, rem ] = divrem(int, radix)
// //       yield String.fromCharCode(rem + offset)
// //     }
// //   },
// //   function* (str) {
// //     let num = 0
// //     for (let i = 0; i < str.length; i++) {
// //       yield str.charCodeAt(i) - offset
// //     }
// //   }
// // ]
// //
// // const mapAgrs = (mapper, fn) => (...args) => fn(...agrs.map(mapper))
//
// // const intSerializer = (radix, offset) => {
// //   return [
// //     (int) => {
// //       let rem = 0
// //       let str = ''
// //       while (int !== 0) {
// //         [ int, rem ] = divrem(int, radix)
// //         str += String.fromCharCode(rem + offset)
// //       }
// //       return str
// //     },
// //     (str) => {
// //       let num = 0
// //       for (let i = 0; i < str.length; i++) {
// //         num += (radix ** i) * (str.charCodeAt(i) - offset)
// //       }
// //       return num
// //     },
// //     (str, divisor) => {
// //       let result
// //       let new_str = ''
// //       let carry = 0
// //       for (let i = str.length; i > 0 ; i--) {
// //         [ result, carry ] = divrem(str.charCodeAt(i - 1) - offset + carry * radix, divisor)
// //         if (result) {
// //           new_str += String.fromCharCode(result + offset)
// //         }
// //       }
// //       return [ new_str, carry ]
// //     }
// //   ]
// // }
//
// // const strReader = (str) => {
// //   let i = 0
// //   return () => {
// //     if (i < str.length) {
// //       return str[i++]
// //     }
// //   }
// // }
// //
// // const hashReader = reader => hash => pipe(strReader(hash), reader)
