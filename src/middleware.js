const middlewareWrapper = (middleware, next) => (context, ...args) => {
  middleware(context, next(context, ...args))
}

const applyMiddlewares = (action, middlewares) =>
  Object.defineProperty(
    middlewares.reduceRight((acc, middleware) =>
      middlewareWrapper(middleware, acc),
      action.middleware
        ? (ctx, ...args) => () => action(ctx, ...args)
        : (_, ...args) => () => action(...args)
    ),
    "middleware",
    { value: true }
  )

const middlewareHandler = middlewares => target => {
  switch (typeof target) {
    case "function": {
      return applyMiddlewares(target, middlewares)
    }
    case "object": {
      if (target && !Array.isArray(target)) {
        const result = {}
        for (const key in target) {
          result[key] = middlewareHandler(middlewares)(target[key])
        }
        return result
      }
    }
    default: {
      return target
    }
  }
}

export const connect = (target) => (...middlewares) => middlewareHandler(middlewares)(target)

// const withPermission = (action, ...permisisons) =>
//   connect(action)(
//     requirePermissions(permisisons)
//   )

// const Auth = middleware($ => {
//   $.assertPermission(Auth)
// })

// const fetchUsers = withPermission(
//   action(({ where, limit, offset }) => query(
//     $ => $.Users
//       .latest({ active })
//       .find(where)
//       .skip(offset)
//       .limit(limit)
//       .data()
//       .meta()
//   )),
//   User.Read
// )

// connect(
//   UserActions
// )(
//   Auth,
//   User
// )
