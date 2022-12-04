import query from "./iterable"

export const generateGetters = (instance, store, methods, type) => {
  const documents = {
    byId: {},
    ids: []
  }
  const records = {
    byId: {},
    revisions: [],
    publications: []
  }
  store[type] = {
    hasDocument (id) {
      return documents.byId.hasOwnProperty(id)
    },
    hasRecord (id) {
      return records.byId.hasOwnProperty(id)
    },
    createDocument (id) {
      // console.log("CREATE DOC", id, type)
      if (!documents.byId.hasOwnProperty(id)) {
        documents.ids.push(id)
        documents.byId[id] = {
          records: {
            revisions: [],
            publications: [],
          },
          active: null,
          // latest: null,
          archived: false
        }
      }
    },
    createRecord (documentId, record) {
      // console.log("CREATE RECORD", id, record)
      const { id } = record.revision
      const document = documents.byId[documentId]
      document.records.revisions.push(id)
      records.revisions.push(id)
      records.byId[id] = record
      if (record.revision.published) {
        records.publications.push(id)
        document.records.publications.push(id)
      }
      document.active = record.revision.published = record.revision.published || document.active
      document.archived = record.archived
    }
  }
  methods[type] = {
    getDocuments () {
      return query(
        documents.byId,
        documents.ids
      )
    },
    getActiveRevision (documentId) {
      const { active } = documents.byId[documentId]
      return active && records.byId[active]
    },
    getPublications (documentId) {
      return query(
        records.byId,
        documentId == null
          ? records.publications
          : documents.byId[documentId].records.publications
      )
    },
    getRevisions (documentId) {
      return query(
        records.byId,
        documentId == null
          ? records.revisions
          : documents.byId[documentId].records.revisions
      )
    }
  }
}
