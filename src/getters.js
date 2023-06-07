import iterable from "./iterable.js"

export const generateGetters = (instance, store, methods, type) => {
  const documents = {
    byId: {},
    // ids: []
    ids: {
      all: [],
      active: [],
      archived: []
    }
  }
  const records = {
    byId: {},
    ids: {
      revisions: [],
      publications: [],
      drafts: []
    },
    // revisions: [],
    // publications: [],
    // ids: {
    //   revisions: [],
    //   publications: [],
    //   drafts: []
    // }
  }
  store[type] = {
    getActiveDocuments (...ids) {
      return ids.reduce((acc, id) => {
        const { publication } = documents.byId[id]
        publication && acc.push(records.byId[publication])
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
        documents.ids.all.push(id)
        documents.byId[id] = {
          records: {
            revisions: [],
            publications: [],
            drafts: []
          },
          latest: {
            revision: null,
            publication: null,
            draft: null
          },
          // latest: null,
          // active: null,
          // draft: null,
          archived: false
        }
      }
    },
    createDocumentGetters (document) {
      // console.log({ document })
      const { id } = document
      document.published ?? Object.defineProperties(document, {
        published: {
          enumerable: true,
          get: () => documents.byId[id].latest.publication != null
        },
        archived: {
          enumerable: true,
          get: () => documents.byId[id].archived
        }
      });
    },
    createRecord (documentId, record) {
      // console.log("CREATE RECORD", id, record)
      const { id } = record.revision
      const document = documents.byId[documentId]
      document.records.revisions.push(id)
      records.ids.revisions.push(id)
      records.byId[id] = record
      if (record.revision.published) {
        records.ids.publications.push(id)
        document.records.publications.push(id)
      } else {
        records.ids.drafts.push(id)
        document.records.drafts.push(id)
      }
      console.log(document.latest, document)
      document.latest.active = record.revision.published ? record.revision.id : document.latest.active
      document.latest.draft = record.revision.published ? document.latest.draft : record.revision.id
      document.archived = record.archived
      document.latest.revision = record.revision.id
    }
  }
  const query = iterable(store, store[type], methods)
  methods[type] = {
    getDocuments () {
      return query(
        documents.byId,
        documents.ids.all
      )
    },
    // get().latest({ published: true })
    activeRevisions () {
      return this.getDocuments()
        .find(item => item.latest.publication != null)
        .map(item => records.byId[item.active])
    },
    // get({ id }).latest({ published: true })
    getActiveRevision (documentId) {
      const { latest: { publication } } = documents.byId[documentId]
      return publication && records.byId[publication]
    },
    // get({ id }).latest({ published: null })
    getLatestRevision (documentId) {
      const { latest: { revision } } = documents.byId[documentId]
      return revision && records.byId[revision]
    },
    // get({ id }).all({ published: true })
    getPublications (documentId) {
      return query(
        records.byId,
        documentId == null
          ? records.ids.publications
          : documents.byId[documentId].records.publications
      )
    },
    // get({ id }).all({ published: null })
    // get().all({ published: null })
    getRevisions (documentId) {
      return query(
        records.byId,
        documentId == null
          ? records.ids.revisions
          : documents.byId[documentId].records.revisions
      )
    },
    // get({ id, revision: true })
    getRevision (revisionId) {
      return records.byId[revisionId]
    }
  }
}

/*

Post
  .find({
    id: [],
    archived: false
  })
  .latest({
    publised: true
  })
  .all({
    publised: true,
  })

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
