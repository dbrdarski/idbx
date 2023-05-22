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
  // globalThis.db = db
  const schema = () => {
    // define('doc')
    // define('post')

    class TaxonomyHead {
      title = String
      slug = String
    }

    class Vdom {
      tag = String
      attrs = Object
      children = Array(globalThis.$or(Vdom, String))
    }

    return {
      user () {
        return class User {
          name = String
          email = String
        }
      },
      post ({ tag, category }) {
        const Tag = this.belongsToMany({ tag })
        const Category = this.belongsToMany({ category })
        class Taxonomies {
          tags = Array(Tag)
          categories = Array(Category)
        }
        return class Post {
          header = TaxonomyHead
          body = Vdom
          taxonomies = Taxonomies
        }
      },
      page () {
        return class Page {
          header = TaxonomyHead
          body = Vdom
        }
      },
      category ({ post }) {
        this.publish = true
        this.hasMany({
          post
        }, "category")
        return TaxonomyHead
      },
      tag ({ post }) {
        this.publish = true
        this.hasMany({
          post
        }, "tag")
        return TaxonomyHead
      },
      pageTree ({ page }) {
        const Page = this.belongsToMany({ page })
        return class Route {
          page_id = Page
          path = String
          children = Array(Route)
        }
      }
    }
  }

  const db = repository(browser)
  const repo = db(schema)
  // const r = await repo[localStorage.hasOwnProperty("Pero") ? "open" : "create"]("Pero")
  const r = globalThis.$ = await repo[localStorage.hasOwnProperty("Blazo") ? "open" : "create"]("Blazo")

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

  Object.assign(globalThis, {
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
  // globalThis.db = db
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

EDIT:
The 'published' and 'archived' properties can be included both in the revision
and document to actually to distinguish between document and revision state.

payload: {
  document: { type: String, id: UUID, published: Boolean, archived: Boolean, active: UUID },
  revision: { id: UUID, published: Boolean, archived: Boolean, author: UUID, timestamp: Number }
  record:  { ...data }
}

document: { published, archived, active } should all be enumerable getters

All in due time though!
`)
