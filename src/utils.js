const radix32bits = 2n ** 32n

export function noop () {}
export const id = id => id
export const define = (target, key, value) => Object.defineProperty(target, key, {
  value,
  enumerable: true
})

export const pipe2 = (x, y) => z => y(x(z))
export const pipe = (...fns) => fns.reduce(pipe2)

export const mapToReduce = fn => (acc, v) => fn(v)
// export const mapToReduce = fn => (acc, v, i, arr) => fn(v, i, arr)

const divrem = (a, b) => [ a / b, a % b ]
const sum = (a, b) => a + b
const inc = sum.bind(null, 1n)

export const getType = (v) => v == null
  ? "void"
  : Array.isArray(v)
    ? "array"
    : typeof v


const intSerializer = (radix, offset) => [
  int => {
    int = BigInt(int)
    let rem = 0n
    // let output = []
    let str = ""
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
    let str = ""
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

export function floatToIntArray (f) {
  return new Uint32Array(Float64Array.of(f).buffer);
}

export function intArrayToFloat (is) {
  return (new Float64Array(Uint32Array.from(is).buffer))[0];
}

export const encodeFloat = n => encodeInt(floatToIntArray(n).reverse().reduce((acc, v, i) => acc + BigInt(v) * radix32bits ** BigInt(i), 0n))
export const decodeFloat = str => intArrayToFloat(divrem(decodeInt(str), radix32bits).map(Number))

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