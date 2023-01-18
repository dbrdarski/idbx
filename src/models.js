import { generateGetters } from "./getters"
import { generateSetters } from "./schema"
import { generateRelations } from "./relations"

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
