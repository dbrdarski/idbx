export const initIds = () => {
  const ids = {}
  const generateType = type => {
    const documents = {}
    ids[type] = {
      createDocument (id) {
        documents[id] = {
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
        const document = documents[id]
        document.records.revisions[record.revision.id] = record
        document.active = record.revision.published = record.revision.published || document.active
        if (record.revision.published) {
          document.records.publications[record.revision.id] = record
        }
        document.archived = record.archived
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
      }
    }
  }
  return { ids, generateType }
}
