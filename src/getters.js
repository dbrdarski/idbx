import iterable from "./iterable.js"
import item from "./query-item.js"

const notNull = item => item != null
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

  methods[type] = {
    testRelationships(...args) {
      return storeHelpers.queryRelationship(...args)
    },
    latest({ id, rel, archived = false, published } = {}) {
      const mode = published === true ? "publications" : published === false ? "drafts" : "revisions"
      if (rel) {

      } else if (id) {
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
          documents.ids
        ).find(
          matchStatus
        ).map(
          item => records.revisions.byId[item[mode].latest]
        ).find(
          notNull
        )
      }
    },
    revisions({ id, archived = false, published }) {
      const mode = published === true ? "publications" : published === false ? "drafts" : "revisions"
      if (id) {
        const document = documents.byId[id]
        const status = archived == null || document?.archived === archived
        if (!document || !status) {
          return queryCollection({}, [])
        }
        return queryCollection(
          records.revisions.byId,
          document[mode].ids
        )
      } else {
        const matchStatus = archived == null ? null : document => document.archived === archived
        return queryCollection(
          records.revisions.byId,
          records[mode].ids
        ).find(
          matchStatus
        )
      }
    },
    revision({ id, archived = false, published }) {
      const match = records.revisions.byId[id]
      const status = archived == match.archived || archived == null
      return status && match
        ? queryItem(match.document.id, match)
        : queryItem(null, null)
    }
  }
}
