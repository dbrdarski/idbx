# IDBX project
A JavaScript Content Repository
## a.k.a LynxDB

### Introduction
What is LynxDB? One way to describe it would an in-memory document database with built-in versioning. It's an append only databse, which means documents can be updated and archived, but this is done through creating "revisions" of existing documents, so no data is ever lost in the process.

The implementation at its core is based around the idea of structural sharing, which means any objects (deeply) equal by value (but not necessearly by reference) will get resolved to a single object when stored. All data is treated as immutable.

This is how memory efficiency is achieved. This especially efficient when dealing with incremental changes to large documents, as all the common nodes will be reused between revisions (in fact between all the records in the database).

Note: This is all WIP and in very early stages. Not meant for production by any means.

### Examples

#### Defining schema

```javascript
export default function schema({ $or }) {
  class TitleAndSlug { // reusable schema segment
    title = String
    slug = String
  }
  class Vdom { // this one is also recursive as it contains reference to itself
    tag = String
    attrs = Object
    children = Array($or(Vdom, String)) // Array(Vdom | String) with Babel transformer
  }
  return {
    post({ tag, category }) {
      const Tag = this.belongsToMany({ tag }) // defines an a foreign key association for tag
      const Category = this.belongsToMany({ category }) // category association
      // Note: this foreign keys will be "captured" regardless of where they appear in the schema even in recursive segments (like 'Vdom' example above) and can be used for joins and querying by associations
      //
      class Taxonomies {
        tags = Array(Tag)
        categories = Array(Category)
      }

      return class Post {
        header = TitleAndSlug
        body = Array($or(Vdom, String)) // Array(Vdom | String) with Babel transformer
        taxonomies = Taxonomies
        options = Object
      }
    },
    category({ post }) {
        this.hasMany({ post }, "category") // defines reverse association
        return TitleAndSlug
    },
    tag({ post }) {
        this.hasMany({ post }, "tag") // defines reverse association
        return TitleAndSlug
    },
  }
}
```

#### Query examples

To fetch ten posts (latest published edits/revisions)
```javascript
const posts = db.query($ => $.post
  .latest({ published: true })
  .limit(10)
  .meta({ // adds meta field to result
    total: $.post
      .latest({ published: true })
      .count()
  })
  .data() // executes query
)
```

Since all the methods ignore null/undefined values you can create a generic version of the query function like this:

```javascript
export function fetchPosts({ offset, limit, where, filter } = {}) {
  return db.query($ => $.post
    .latest(filter)
    .find(where)
    .skip(offset)
    .limit(limit)
    .meta({
      total: $[type]
        .latest(filter)
        .find(where)
        .count()
    })
    .data()
  )
}

const posts = fetchPosts({
  filter: { published: true },
  limit: 10
})

const archivedPostsAbouCats = fetchPosts({
  filter: { archived: true },
  where (post) {
    return post.record.header.slug.includes("cat")
  }
})
```

### Roadmap

* 0.1.0
  - Add support for querying by associations (currently only being used in joins)
* 0.1.1
  - Figure out correct async scheduling and recording guarantees
* 0.1.2
  - Replace JS objects with Maps for the stores modules
* 0.1.3
  - implement Unique constraint (as Schema Validator)
* 0.1.4
  - implement fork method on iterator
* 0.1.5
  - implement (lazy) sorting
* 0.2.0
  - heavy code refactor
  - implement data encryption
* 0.2.1
  - implement Babel transforms for .jsr files
