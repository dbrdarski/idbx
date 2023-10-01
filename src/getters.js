import iterable from "./iterable.js"
import item from "./query-item.js"

const documentEntry = () => ({
  revisions: {
    ids: [],
    latest: null
  },
  publications: {
    ids: [],
    latest: null
  },
  drafts: {
    ids: [],
    latest: null
  },
  // latest: null,
  // active: null,
  // draft: null,
  archived: false
})

export const generateGetters = (instance, store, methods, type) => {
  const documents = {
    byId: {},
    ids: []
  }
  const records = {
    revisions: {
      byId: {},
      ids: []
    },
    publications: {
      byId: {},
      ids: []
    },
    drafts: {
      byId: {},
      ids: []
    }
  }
  store[type] = {
    getActiveDocuments(...ids) {
      return ids.reduce((acc, id) => {
        const { publications: { latest } } = documents.byId[id]
        latest && acc.push(records.revisions.byId[latest])
        return acc
      }, [])
    },
    hasDocument(id) {
      return documents.byId.hasOwnProperty(id)
    },
    hasRecord(id) {
      return records.revisions.byId.hasOwnProperty(id)
    },
    createDocument(id) {
      // console.log("CREATE DOC", id, type)
      if (!documents.byId.hasOwnProperty(id)) {
        // documents.archived.ids.push(id)
        documents.ids.push(id)

        // documents.archived.byId[id] =
        documents.byId[id] = documentEntry()
      }
    },
    createDocumentGetters(document) {
      const { id } = document
      document.published ?? Object.defineProperties(document, {
        published: {
          enumerable: true,
          get: () => documents.byId[id].publications.latest != null
        },
        archived: {
          enumerable: true,
          get: () => documents.byId[id].archived
        }
      });
    },
    createRecord(documentId, record, archived, published) {
      // console.log("CREATE RECORD", id, record)
      const { id } = record.revision

      if (archived) {
        documents
      }

      const document = documents.byId[documentId]
      document.revisions.ids.push(id)
      records.revisions.ids.push(id)
      records.revisions.byId[id] = record
      if (record.revision.published) {
        records.publications.ids.push(id)
        document.publications.ids.push(id)
        records.publications.byId[id] = record
      } else {
        records.drafts.ids.push(id)
        document.drafts.ids.push(id)
        records.drafts.byId[id] = record
      }
      document.publications.latest = record.revision.published ? record.revision.id : document.publications.latest
      document.drafts.latest = record.revision.published ? document.drafts.latest : record.revision.id
      document.revisions.latest = record.revision.id
      document.archived = record.archived
    }
  }

  const queryItem = item(store, store[type], methods)
  const queryCollection = iterable(store, store[type], methods)

  methods[type] = {
    latest({ id, archived = false, published }) {
      const matchStatus = archived === null ? null : document => document.archived === archived
      const mode = published === true ? "publications" : published === false ? "drafts" : "revisions"
      if (id) {
        const document = documents.byId[id]
        const status = archived == null || document?.archived === archived

        if (!document && !status) {
          return queryItem(null, null)
        }

        const value = document[mode].latest
        return queryItem(value, records.revisions.byId[value])
      } else {
        return queryCollection(
          documents.byId,
          documents.ids
        ).find(
          matchStatus
        ).map(
          item => records.revisions.byId[item[mode].latest]
        ).find(
          item => item != null
        )
      }
    },
    revisions({ id, archived = false, published }) {
      if (id) {
        const document = documents.byId[id]
        const status = archived == null || document?.archived === archived
        if (!document || !status) {
          return queryCollection({}, [])
        }
        // const items = documents[archived === false ? "active" : archived === true ? "archived" : "all"].byId[id]
        // if (!items) {
        //   return null // TODO: make this query-able
        // }
        //
        return queryCollection(
          records.revisions.byId,
          document[published === true ? "publications" : published === false ? "drafts" : "revisions"].ids
        )
      } else {
        // TODO: flat Map resultls hell
      }
    },
    revision({ id, archived = false, published }) {
      const match = records.revisions.byId[id]
      const status = archived == match.archived || archived == null
      return status && match
        ? queryItem(id, match)
        : queryItem(null, null)
    },
    getDocuments() {
      return queryCollection(
        documents.byId,
        documents.ids
      )
    },
    // get().latest({ published: true })
    activeRevisions() {
      return queryCollection(
        documents.byId,
        documents.ids
      ).map(item => records.revisions.byId[item.publications.latest])

      // return this.getDocuments()
      //   .find(item => item.active != null)
      //   .map(item => records.revisions.byId[item.active])
    },
    // get({ id }).latest({ published: true })
    getActiveRevision(documentId) {
      const { publications: { latest } } = documents.byId[documentId]
      return latest && records.revisions.byId[latest]
    },
    // get({ id }).latest({ published: null })
    getLatestRevision(documentId) {
      const { revisions: { latest } } = documents.byId[documentId]
      return latest && records.revisions.byId[latest]
    },
    // get({ id }).all({ published: true })
    getPublications(documentId) {
      return queryCollection(
        records.revisions.byId,
        documentId == null
          ? records.publications.ids
          : documents.byId[documentId].publications.ids
      )
    },
    // get({ id }).all({ published: null })
    // get().all({ published: null })
    getRevisions(documentId) {
      return queryCollection(
        records.revisions.byId,
        documentId == null
          ? records.revisions.ids
          : documents.byId[documentId].revisions.ids
      )
    },
    // get({ id, revision: true })
    getRevision(revisionId) {
      return records.revisions.byId[revisionId]
    }
  }
}

// export function fetchEntries(type, { offset, limit, where } = {}) {
//   return queryCollection($ => {
//     const entry = $[type]
//     return entry
//       .latest({ archived: false })
//       .find(where)
//       .skip(offset)
//       .limit(limit)
//       .meta({
//         total: entry(options)
//           .latest({ archived: false })
//           .find(where)
//           .count()
//       })
//       .include(($, entry) => $(
//         entry.tag,
//         entry.category
//       ))
//       .data()
//   })
// }
