/*

  OPEN ISSUES:
  ============

  Should Validation be strict?
  should extra properties be ignored?
  Should schema initialize the values (like set defaults) or simple validate?
  How should associations be handled?

*/

// const schema = definition => {
//   const default = {}
//   for (const k in definition) {
//     const d = definition[k]
//     default[k] = typeof d === "object"
//       ? d?.default
//       : null
//   }
//   return obj => {
//     const test = Object.assign({}, definition, obj)
//     for (const key in definition) {
//
//     }
//   }
// }
