export const initIds = () => {
  const ids = {}
  const getters = {}
  const generateType = type => {
    const documents = {}
    ids[type] = {
      createDocument (id) {
        // console.log("CREATE DOC", id, type)
        documents[id] = documents[id] || {
          records: {
            revisions: {},
            publications: {},
          },
          active: null,
          // latest: null,
          archived: false
        }
      },
      createRecord (id, record) {
        // console.log("CREATE RECORD", id, record)
        const document = documents[id]
        document.records.revisions[record.revision.id] = record
        document.active = record.revision.published = record.revision.published || document.active
        if (record.revision.published) {
          document.records.publications[record.revision.id] = record
        }
        document.archived = record.archived
      }
    }
    getters[type] = {
      getDocuments (id, active = true) {
        return Object.keys(documents)
          .filter(id => documents[id].archived !== active)
      },
      getActiveRevision (id) {
        const { active, records } = documents[id]
        return active && records.revisions[active]
      },
      getPublications (id) {
        const { records } = documents[id]
        return Object.keys(records.publications)
      },
      getRevisions (id) {
        const { records } = documents[id]
        return Object.keys(records.revisions)
          .filter(id => records.revisions[id].archived === false)
      }
    }
  }
  return { ids, getters, generateType }
}
