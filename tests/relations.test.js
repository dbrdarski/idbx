import { setter, includeProxy, createRecorder, createIncluder } from "../src/relations.js"

const tag1 = {
  document: { id: 1 },
  record: { name: "JavaScript" }
}
const tag2 = {
  document: { id: 2 },
  record: { name: "React" }
}
const tag3 = {
  document: { id: 3 },
  record: { name: "Vue.js" }
}

const post1 = {
  document: { id: 1 },
  record: {
    tags: [1, 2],
    title: "JavaScript: The Good Parts"
  }
}

const post2 = {
  document: { id: 1 },
  record: {
    tags: [2, 3],
    title: "Mostly Adequate Guide to Functional Programming"
  }
}

const schema = () => {
  return {
    post({ tag }) {
      const Tag = this.belongsToMany({ tag })
      return class Post {
        tags = Array(Tag)
        title = String
      }
    },
    tag({ post }) {
      this.hasMany({ post }, "tag")
      return class Tag {
        name = String
      }
    }
  }
}

test('relationships: test setter fn', () => {
  const includes = {}
  const set = setter(includes, "tag")

  set(tag1)
  set(tag2)
  set(tag3)
  expect(Object.keys(includes.tag)).toHaveLength(3);
  expect(includes.tag["1"]).toBe(tag1);
});

test('relationships: test includerProxy', () => {
  const includes = {}
  const $ = includeProxy(includes)
  const set = $.tag()
  set(tag1)
  set(tag2)
  set(tag3)
  console.log(includes)
  expect(Object.keys(includes.tag)).toHaveLength(3);
  expect(includes.tag["1"]).toBe(tag1);
})

test('relationships: test includer', () => {
  const includes = {}
  const recorder = createRecorder({})
  const include = createIncluder(new Map, recorder, schema, "post")
  const set = include(($, post) => $(post.tag), includes)

  // set(post1)
  // set(post2)
  console.log(includes)
  expect(Object.keys(includes.tag)).toHaveLength(3);
  expect(includes.tag["1"]).toBe(tag1);
})
