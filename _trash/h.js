diffSpreadedObject ({ create, update, delete }, cache = new Set) => (attrs) => {
  let newCache = new Set;
  for (const [ key, value ] of Object.entries(attrs)) {
    if (create && cache.has(key) === false) {
      create(key, value);
      newCache.add(key);
      continue;
    }
    update(key, value)
    newCache.add(key);
    cache.delete(key);
  }
  for (key of cache) {
    delete(key, value);
  }
  cache = newCache;
}

function removeAttribute(key) {
  this.removeAttribute(key)
}

const removeAttr = el => removeAttribute.bind(el);

const spreadAttrsHandler = (el) => diffSpreadedObject({
  update: patchAttr(el),
  delete: removeAttr(el)
})
