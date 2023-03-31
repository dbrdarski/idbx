import { generateGetters } from "./getters.js"
import { generateSetters } from "./schema.js"
import { generateRelations } from "./relations.js"

export const initModels = () => {
  const store = {}
  const methods = {}
  const generateModels = (instance, type, typeInit, def) => {
    generateGetters(
      instance,
      store,
      methods,
      type
    )

    const { relationshipMethods, relationships } = generateRelations(
      instance,
      store,
      methods,
      type,
      typeInit,
      def
    )

    generateSetters(
      instance,
      store,
      methods,
      type,
      typeInit.bind(relationshipMethods, relationships)
    )
  }
  return { store, methods, generateModels }
}
