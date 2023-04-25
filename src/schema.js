import { getType, isClass } from "./utils.js"

/*
  OPEN ISSUES:
  ============

  Should Validation be strict?
    :: Yes
  should extra properties be ignored?
    :: No, they should throw!
  Should schema initialize the values (like set defaults) or simple validate?
    :: Why not?!
  How should associations be handled?
    :: Elegantly
*/

export const $or = globalThis.$or = (v1, v2) => {
  const validator = x => v1(x) || v2(x)
  v1 = createValidator(v1)
  v2 = createValidator(v2)
  validator.toString = () => `${v1}|${v2}`
  return validator
}

const validators = new Map
const setValidator = (type, validator) => {
  validators.set(type, validator)
  validator.toString = () => type.name
}

const setToString = (fn, toString) => {
  fn.toString = toString
  return fn
}

const createSchema = Schema => {
  if (validators.has(Schema)) {
    return validators.get(Schema)
  }
  const validator = target => {
    const keys = new Set([ ...defKeys, ...Object.keys(target) ])

    if (getType(target) !== "object")
      return false

    for (const key of keys) {
      if (!schema.hasOwnProperty(key)) {
        throw Error(`Unknown property '${key}' in ${schema.name}`)
      } else if (!target.hasOwnProperty(key)) {
        throw Error(`Missing property '${key}' in ${schema.name}`)
      } else {
        const match = schema[key](target[key])
        if (!match) {
          // console.error(`Unexpected value for ${key} property object. Expected: . Found: ${getType(target[key])}`)
          throw Error(`Unexpected value for ${key} property object. Expected: ${schema[key].toString().toLowerCase()}. Found type: ${handlerErrorType(target[key])}`)
        }
      }
    }
    return true
  }
  setValidator(Schema, validator)

  const [ defKeys, schema ] = Object.entries(new Schema).reduce(
    (acc, [k, v]) => {
      acc[0].push(k)
      acc[1][k] = createValidator(v)
      return acc
    },
    [[],{}]
  )
  return validator
}

const validateArray = (def, validate) => x => {
  if (!validate(x)) {
    throw Error(`Expected all items in collection to be of type ${def.toString()} but found item of ${x != null ? x.constructor.name : 'null'}`)
  }
  return true
}

const createValidator = (def, validator) => {
  if (validators.has(def)) {
    return validators.get(def)
  } else if (Array.isArray(def)) {
    [ def ] = def
    const validator = validateArray(def, createValidator(def))
    return xs => xs.every(validator)
  } else if (typeof def === "function") {
    return isClass(def) ? createSchema(def, validator) : def
  }
}

const handlerErrorType = v => {
  const type = getType(v)
  // if (type === "array") {
  //   return `array<${arrayError().join()}>`
  // }
  return type
}

setValidator(String, x => typeof x === "string")
setValidator(Boolean, x => typeof x === "boolean")
setValidator(Number, x => typeof x === "number")
setValidator(BigInt, x => typeof x === "bigint")
setValidator(Symbol, x => typeof x === "symbol")
setValidator(Object, x => x && typeof x === "object")
setValidator(Array, x => Array.isArray(x))

const createModelSchema = model => {
  const validate = createSchema(model)
  return data => {
    try {
      return validate(data)
    } catch (err) {
      console.error(err)
    }
  }
}

export const generateSetters = (instance, store, methods, type, initType) => {
  // const validate = createSchema(initType.call(relations, {}))
  const validate = createModelSchema(initType())
  const idbx = globalThis.idbx = globalThis.idbx ?? {}
  store[type].validate = idbx[type] = validate
  methods[type].createDocument = (data, publish) => {
    return instance.save({ type, data, publish })
  }
  methods[type].createRevision = function (id, data, from, publish) {
    return instance.save({ id, type, data, publish, from })
  }
  methods[type].archive = function (id, status = true) {
    return instance.save({ })
  }
  // return validate
}
