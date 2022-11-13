import { repository } from "./src/db.mjs"
import http from "http"
import { macros_article_JSON, cezare_borgia_JSON } from "./sample_data/index.js"
import browser from "./src/adapters/browser.js"

import { getVNodeTree, render } from "./src/utils.js"

const syncDom = (target, vdom) => {
  const el = render(null, vdom)
  target.replaceWith(el)
  return el
}

const renderer = target => [
  () => getVNodeTree(target),
  vdom => {
    target = syncDom(target, vdom)
  }
];

!(async () => {
  // const db = await db.open('pero')
  // window.db = db
  const schema = (define, { schema, ...$ } = {}) => {
    define('doc')
    define('post')
    return {
      user () {
        return schema({
          name: $.String,
          email: $.String
        })
      },
      post ({ tag, category }) {
        this.belongsToMany({
          tag,
          category
        })
        const Vdom = schema({
          tag: $(String, {
            default: ""
          }),
          attrs: $(Object),
          children: $(Array.of(Vdom))
        })
        return schema({
          header: schema({
            title: $(String),
            slug: $(String)
          }),
          body: Vdom
        })
      },
      page () {
        const Vdom = schema({
          tag: $.String,
          attrs: $. Object,
          children: $.Array.of(Vdom)
        })
        return schema({
          header: schema({
            title: $.String
          }),
          body: Vdom
        })
      },
      category ({ post }) {
        this.publish = true
        this.hasMany(post)
        return schema({
          title: $.String,
          slug: $.String
        })
      },
      tag ({ post }) {
        this.publish = true
        this.hasMany(post)
        return schema({
          title: $.String,
          slug: $.String({
            default: kebabCase
          })
        })
      },
      pageTree ({ page }) {
        const Route = schema({
          page_id: $.UUID.of(page),
          path: $.String,
          children: $.Array.of(Route)
        })
        return Route
      }
    }
  }

  const db = repository(browser)
  const repo = db(schema)
  const r = await repo[localStorage.hasOwnProperty("Pero") ? "open" : "create"]("Pero")

  cezare_borgia_JSON.tag = "div"
  cezare_borgia_JSON.attrs.contenteditable = true
  const [ readDOM, writeDOM ] = renderer(document.body.querySelector("#app"))

  const getRevisionByIndex = index => r.query(($)=> $.doc.getRevisions().data())[index]
  const loadRevision = i => {
    const r = getRevisionByIndex(i)
    writeDOM(r.data)
    return r
  }

  const saveRevision = ({ document: { id, type } = {}, revision: { from } = {}} = {}) => {
    r.save({
      id,
      type: "doc",
      data: readDOM(),
      from,
      publish: true
    })
  }

  Object.assign(window, {
    render,
    r,
    readDOM,
    writeDOM,
    repository,
    db,
    repo,
    getRevisionByIndex,
    loadRevision,
    saveRevision,
    macros_article_JSON,
    cezare_borgia_JSON
  })
  // window.db = db
})()

console.log(`
OK, so few notes here:

=====================================================================

So apparently it has come to my attention that 'archived' property
can become part of document: { type, id }, meta { author, timestamp }
can become part of revision and data field can be renamed to 'record'

---------------------------------------------------------------------

Also active (revision) could be part of document as well now that I
think about it and 'published' should be boolean!

---------------------------------------------------------------------

All in due time though!
`)
