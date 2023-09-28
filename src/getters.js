import iterable from "./iterable.js"
import queryItem from "./query-item.js"

export const generateGetters = (instance, store, methods, type) => {
  const documents = {
    all: {
      byId: {},
      ids: []
    },
    active: {
      byId: {},
      ids: []
    },
    archived: {
      byId: {},
      ids: []
    }
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
        const { publications: { latest } } = documents.all.byId[id]
        latest && acc.push(records.revisions.byId[latest])
        return acc
      }, [])
    },
    hasDocument(id) {
      return documents.all.byId.hasOwnProperty(id)
    },
    hasRecord(id) {
      return records.revisions.byId.hasOwnProperty(id)
    },
    createDocument(id) {
      // console.log("CREATE DOC", id, type)
      if (!documents.all.byId.hasOwnProperty(id)) {
        documents.all.ids.push(id)
        documents.active.ids.push(id)
        documents.all.byId[id] = {
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
        }
      }
    },
    createDocumentGetters(document) {
      // console.log({ document })
      const { id } = document
      document.published ?? Object.defineProperties(document, {
        published: {
          enumerable: true,
          get: () => documents.all.byId[id].publications.latest != null
        },
        archived: {
          enumerable: true,
          get: () => documents.all.byId[id].archived
        }
      });
    },
    createRecord(documentId, record) {
      // console.log("CREATE RECORD", id, record)
      const { id } = record.revision
      const document = documents.all.byId[documentId]
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

  const queryItem = queryItem(store, store[type], methods)
  const queryCollection = iterable(store, store[type], methods)

  methods[type] = {
    latest({ id, archived = false, published }) {
      const status = archived === false ? "active" : archived === true ? "archived" : "all"
      const mode = published === true ? "publications" : published === false ? "drafts" : "revisions"
      if (id) {
        const match = documents[status].byId[id]
        const value = match[mode].latest
        return queryItem(value && id, value)
      } else {
        return queryCollection(
          documents[status].byId,
          documents[status].ids
        ).map(
          item => records.revisions.byId[item[mode].latest]
        ).filter(
          item => item != null
        )
      }
    },
    revisions({ id, archived = false, published }) {
      if (id) {
        const items = documents[archived === false ? "active" : archived === true ? "archived" : "all"].byId[id]
        if (!items) {
          return null // TODO: make this query-able
        }
        return queryCollection(
          records.revisions.byId,
          items[published === true ? "publications" : published === false ? "drafts" : "revisions"].ids
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
        documents.all.byId,
        documents.all.ids
      )
    },
    // get().latest({ published: true })
    activeRevisions() {
      return queryCollection(
        documents.all.byId,
        documents.active.ids
      ).map(item => records.revisions.byId[item.publications.latest])

      // return this.getDocuments()
      //   .find(item => item.active != null)
      //   .map(item => records.revisions.byId[item.active])
    },
    // get({ id }).latest({ published: true })
    getActiveRevision(documentId) {
      const { publications: { latest } } = documents.all.byId[documentId]
      return latest && records.revisions.byId[latest]
    },
    // get({ id }).latest({ published: null })
    getLatestRevision(documentId) {
      const { revisions: { latest } } = documents.all.byId[documentId]
      return latest && records.revisions.byId[latest]
    },
    // get({ id }).all({ published: true })
    getPublications(documentId) {
      return queryCollection(
        records.revisions.byId,
        documentId == null
          ? records.publications.ids
          : documents.all.byId[documentId].publications.ids
      )
    },
    // get({ id }).all({ published: null })
    // get().all({ published: null })
    getRevisions(documentId) {
      return queryCollection(
        records.revisions.byId,
        documentId == null
          ? records.revisions.ids
          : documents.all.byId[documentId].revisions.ids
      )
    },
    // get({ id, revision: true })
    getRevision(revisionId) {
      return records.revisions.byId[revisionId]
    }
  }
}

export function fetchEntries(type, { offset, limit, where } = {}) {
  return queryCollection($ => {
    const entry = $[type]
    return entry
      .latest({ archived: false })
      .find(where)
      .skip(offset)
      .limit(limit)
      .meta({
        total: entry(options)
          .latest({ archived: false })
          .find(where)
          .count()
      })
      .include(($, entry) => $(
        entry.tag,
        entry.category
      ))
      .data()
  })
}
