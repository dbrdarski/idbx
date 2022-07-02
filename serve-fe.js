import { repository } from "./src/db.mjs"
import http from "http"
import { macros_article_JSON, cezare_borgia_JSON } from "./sample_data/index.js"
import browser from "./src/adapters/browser.js"


(async () => {
  console.log({ repository, browser })
  const db = repository(browser)
  // const db = await db.open('pero')
  window.db = db
  // window.db = db
})()

// import { read, match } from "./src/index";
// import { objectStore, arrayStore, stringStore, matchType } from "./src/stores.js"
//
// window.allStores = { objectStore, arrayStore, stringStore, matchType };
// window.read = read;
// window.match = match;

console.log("Hello world");
