import { repository } from "./src/db.mjs"
import http from "http"
import { macros_article_JSON, cezare_borgia_JSON } from "./sample_data/index.js"
import browser from "./src/adapters/browser.js"

(async () => {
  // const db = await db.open('pero')
  // window.db = db
  const schema = (define, { schema, ...$ } = {}) => {
    define('doc')
    define('post')
    return {
      user () {
        return schema({

        })
      },
      post ({ tag, category }) {
        this.belongsToMany(tag)
        this.belongsToMany(category)
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
          slug: $.String
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
  const r = await repo.open("Pero")

  Object.assign(window, {
    r,
    repository,
    db,
    repo,
    macros_article_JSON,
    cezare_borgia_JSON
  })
  // window.db = db
})()

console.log("Hello world");
