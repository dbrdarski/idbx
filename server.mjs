import { repository } from "./src/db.mjs"
import http from "http"
import { macros_article_JSON, cezare_borgia_JSON } from "./sample_data/index.js"
import ascii from "./src/adapters/ascii.js"

const DB = repository(ascii)
// const h = (tag, attrs = null, ...children) => new VNode({
//   tag,
//   attrs,
//   children: new VNodeList(children)
// })

// const db = await DB.open("./files/sample.idbx")
// const file = "./files/naum.jsd"
// const file = "./files/wikipedia.idbx"
const file = "./files/2023.idbx"

// class VNode {
//   constructor (o) {
//     Object.assign(this, o)
//   }
//   printAttrs () {
//     const r = Object.entries(this.attrs).map(([ key, value ]) => `${key}${(value == null || value == "") ? "" : `="${value}"`}`).join(" ")
//     return r
//   }
//   toString () {
//     switch (this.tag) {
//       case "script":
//       case "iframe":
//         return ""
//     }
//     const r = `<${ this.tag } ${ this.attrs ? this.printAttrs() : "" }${ this.children.length ? "" : " /" }>${ this.children } ${ this.children.length ? `</${this.tag}>` : "" }`
//     return r
//   }
// }
//
// class VNodeList extends Array {
//   toString () {
//     const r = this.join(" ")
//     return r
//   }
// }

// const data = new VNodeList([
//   h("p", null, "Naum is so gay"),
//   h("p", null, "Naum is so gay"),
//   h("p", null, "Naum is so gay"),
//   h("p", null, "Naum is so gay"),
//   h("p", null, "Naum is super duper gay!!!!!!")
// ])

// const printJSX = jsx => jsx.toString()
// const prepareJSX = data => Array.isArray(data)
//   ? new VNodeList(...data.map(prepareJSX))
//   : typeof data === "object"
//     ? new VNode({ ...data, children: prepareJSX(data.children) })
//     : data

// let counter = 0;
const data = cezare_borgia_JSON
// const data = macros_article_JSON
// const data = {a: 1, b: 2}
// const data = {
//   title: 'Lore Ipsum',
//   content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
// }
// const data = [1, "two", "two", {
//   tag: "p",
//   attrs: {
//     class: "text-right",
//     items: 3,
//     visible: true
//   },
//   children: ["Hello darkness my old friend. I\"ve come to talk with you again"]
// }]

// setTimeout(() => {
//   db.save(data)
// }, 1000)

const requestListener = async function (req, res) {
  if (req.url === "/favicon.ico") return
  // const db = await DB(() => {}).open(file)
  await db.save(data)

  res.writeHead(200, {"Content-Type": "application/json"});
  // res.writeHead(200, {"Content-Type": "text/html"});
  // const { headers, trailers, aborted, upgrade, url, method, statusCode, statusMessage } = req;
  // const jsx = prepareJSX(db.data)
  // console.log(jsx)
  // const text = printJSX(jsx)
  // res.end(text)
  res.end(JSON.stringify(db.data))

  // if (req.url != "/favicon.ico") {
  //     console.log(++counter)
  // }
  // res.end(JSON.stringify({ headers, trailers, aborted, upgrade, url, method, statusCode, statusMessage }))
}

const server = http.createServer(requestListener)
server.listen(8080)

// mamuViEbam = (asyncApi, promise) => {
//   return new Proxy(asyncApi, {
//     get (target, key, proxy) {
//       if (!target.hasOwnProperty(key)) {
//         return Promise.reject()
//       }
//       const prop = target[key]
//       if (typeof prop === "function") {
//         return (...args) => {
//           const newPromise = promise
//           ? promise.then(() => prop(...args))
//           : prop(...args)
//           return mamuViEbam(asyncApi, newPromise)
//         }
//       }
//       return target[key]
//     }
//   })
// }
