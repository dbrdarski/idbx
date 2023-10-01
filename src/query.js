let activeQuery

export const runQuery = (fn, ...args) => {
  const prev = activeQuery
  const newQuery = activeQuery = {}
  const data = fn(...args)
  delete newQuery.includeHandlers
  activeQuery = prev

  return {
    data,
    ...newQuery
  }

}

export const getActiveQueryInstance = () => activeQuery
