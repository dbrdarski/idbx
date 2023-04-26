import iterable from "./iterable.js"

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
    getActiveDocuments (...ids) {
      return ids.reduce((acc, id) => {
        const { active } = documents.byId[id]
        active && acc.push(records.byId[active])
        return acc
      }, [])
    },
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
          latest: null,
          active: null,
          // latest: null,
          archived: false
        }
      }
    },
    createDocumentGetters (document) {
      console.log({ document })
      const { id } = document
      document.published ?? Object.defineProperties(document, {
        published: {
          enumerable: true,
          get: () => documents.byId[id].active != null
        },
        archived: {
          enumerable: true,
          get: () => documents.byId[id].archived
        }
      })
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
      document.active = record.revision.published ? record.revision.id : document.active
      document.archived = record.archived
      document.latest = record.revision.id
    }
  }
  const query = iterable(store, store[type], methods)
  methods[type] = {
    getDocuments () {
      return query(
        documents.byId,
        documents.ids
      )
    },
    activeRevisions () {
      return this.getDocuments()
        .find(item => item.active != null)
        .map(item => records.byId[item.active])
    },
    getActiveRevision (documentId) {
      const { active } = documents.byId[documentId]
      return active && records.byId[active]
    },
    getLatestRevision (documentId) {
      const { latest } = documents.byId[documentId]
      return latest && records.byId[latest]
    },
    getPublications (documentId) {
      return query(
        records.byId,
        documentId == null
          ? records.publications
          : documents.byId[documentId].records.publications
      )
    },
    getRevision (revisionId) {
      return records.byId[revisionId]
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

/*

revision ::
  ()
    :: .all()     => [r]
    :: .latest()  => [r]
    :: .active()  => [r]    // (aka .latestPublished())
    :: .where()   => [r]

  id => r

document ::
  ()
    :: .all()     => [[r]]
    :: .latest()  => [r]
    :: .active()  => [r]    // (aka .latestPublished())
    :: .where()   => [[r]]

  id -> revisions<belongTo(id)>
    :: .all()     => [r]
    :: .latest()  => r
    :: .active()  => r      // -> .latestPublished()
    :: .where()   => [r]

*/
