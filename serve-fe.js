import { repository } from "./src/db.mjs"
import http from "http"
import { macros_article_JSON, cezare_borgia_JSON } from "./sample_data/index.js"
import browser from "./src/adapters/browser.js"


(async () => {
  const db = repository(browser)
  // const db = await db.open('pero')
  // window.db = db
  Object.assign(window, {
    db,
    macros_article_JSON,
    cezare_borgia_JSON
  })
  // window.db = db
})()

console.log("Hello world");
