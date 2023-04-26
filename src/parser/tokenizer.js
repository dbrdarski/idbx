/*
 * Based on Tiny tokenizer: https://gist.github.com/borgar/451393/7698c95178898c9466214867b46acb2ab2f56d68
 */

export const tokenizer = parsers => str => {
  let cursor, match, token, tokens = []
  while (str) {
    token = null
    cursor = str.length
    for (const key in parsers) {
      match = parsers[key].exec(str)
      // try to choose the best match if there are several
      // where "best" is the closest to the current starting point
      if (match && (match.index < cursor)) {
        token = {
          token: match[0],
          type: key,
          matches: match.slice(1)
        }
        cursor = match.index
      }
    }
    if (cursor) {
      throw new Error(`Unknown token: "${ str.substring(0, cursor) }"`)
    } else if (token) {
      // push current token onto sequence
      tokens.push(token)
    }
    str = str.substring(cursor + (token ? token.token.length : 0))
  }
  return tokens
}

const allChars = '[^\\u0000\\u0001\\u0002\\u0003\\u0004\\u0005\\u0006\\u0007\\b\\t\\n\\u000b\\f\\r\\u000e\\u000f\\u0010\\u0011\\u0012\\u0013\\u0014\\u0015\\u0016\\u0017\\u0018\\u0019\\u001a\\u001b\\u001c\\u001d\\u001e\\u001f !\\"#$%&"()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\\\\\]\\^\\_\\`abcdefghijklmnopqrstuvwxyz\\{\\|\\}~ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]'
const singleValues = '[TFV]' // true, false, void
const referentialTypes = '[NOSARD+-]' // number, object, string, array, record, document, bigints
const allValues = `${singleValues}|${referentialTypes}${allChars}+`

const string = /"(?:[^"\\]|\\.)*"/
const basic = RegExp(singleValues)
const array = RegExp(`\\[(${allValues})*\\]`)
const object = RegExp(`\\{([A]${allChars}+)([A]${allChars}+)\\}`)
const record = RegExp(`\\(([D]${allChars}+)([O]${allChars}+)([O]${allChars}+)([TF])\\)`)
const document = RegExp(`\\<([S]${allChars}+)([S]${allChars}+)\\>`)
export const allValuesRegex = RegExp(allValues, 'g')

export const tokenize = tokenizer({
  basic,
  string,
  array,
  object,
  record,
  document
})
