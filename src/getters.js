import iterable from "./iterable.js"
import item from "./query-item.js"

const notNull = item => item != null
const identity = x => x
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

  const storeHelpers = store[type] = {
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
        documents.ids.push(id)
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

  const queryItem = item(store, storeHelpers, methods)
  const queryCollection = iterable(store, storeHelpers, methods)
  const queryRelationship = (rel, active) => {
    if (rel) {
      rel.active = active
      return rel?.(storeHelpers.relationship(identity, rel))
    }
  }

  methods[type] = {
    // relationship(fn) {
    //   const iterable = fn(storeHelpers.relationship(x => x))
    //   return queryCollection(
    //     documents.byId,
    //     iterable
    //   ).map(
    //     item => records.revisions.byId[item.publications.latest]
    //   ).find(
    //     notNull
    //   )
    // },
    latest({ id, rel, archived = false, published } = {}) {
      const mode = published === true ? "publications" : published === false ? "drafts" : "revisions"
      if (id) {
        const document = documents.byId[id]
        const status = archived == null || document?.archived === archived

        if (!document && !status) {
          return queryItem(null, null)
        }

        const value = document[mode].latest
        return queryItem(value && id, records.revisions.byId[value])
      } else {
        const matchStatus = archived == null ? null : document => document.archived === archived
        return queryCollection(
          documents.byId,
          queryRelationship(rel, true) ?? documents.ids
        ).find(
          matchStatus
        ).map(
          item => records.revisions.byId[item[mode].latest]
        ).find(
          notNull
        )
      }
    },
    revisions({
      // rel,
      id, archived = false, published
    } = {}) {
      const mode = published === true ? "publications" : published === false ? "drafts" : "revisions"
      if (id) {
        const document = documents.byId[id]
        const status = archived == null || document?.archived === archived
        if (!document || !status) {
          return queryCollection({}, [])
        }
        // const ids = queryRelationship(rel, false) ?? records[mode].ids
        return queryCollection(
          records.revisions.byId,
          ids
        )
      } else {
        const matchStatus = archived == null ? null : document => document.archived === archived
        // const ids = queryRelationship(rel, false) ?? records[mode].ids
        return queryCollection(
          records.revisions.byId,
          // rel ? ids :
          records[mode].ids
        ).find(
          matchStatus
        )
      }
    },
    revision({ id, archived = false, published }) {
      // should 'published' be also checked?
      const match = records.revisions.byId[id]
      const status = archived == match.archived || archived == null
      return status && match
        ? queryItem(match.document.id, match)
        : queryItem(null, null)
    }
  }
}
