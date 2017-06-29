const path = require('path')

function moduleExecutor (name, options = {}) {
  let defaults = {
    paths: [`${process.cwd()}/node_modules`, process.cwd(), `${process.cwd()}/node_modules/anarchyjs/tasks/`, ''], // Todo: remove '/node_modules/anarchyjs/tasks/'
    critical: true,
    aliases: [],
    delimiter: '.'
  }

  options = Object.assign({}, defaults, options)

  let module = null
  let executor = null

  // Require module
  let nameParts = name.split(options.delimiter)

  let executorName = null
  let moduleName = name

  if (nameParts.length > 1) {
    executorName = nameParts.pop()
    moduleName = nameParts.join(options.delimiter)
  }

  let errors = []

  for (let searchPath of options.paths) {
    try {
      for (let alias of options.aliases) {
        if (moduleName === alias.from) {
          moduleName = alias.to
          break
        }
      }
      module = require(path.join(searchPath, moduleName))
      if (module) {
        break
      }
    } catch (error) {
      let errorString = error.toString()
      if (!errorString.includes('Cannot find module') || !errorString.includes(searchPath)) {
        throw error
      }

      errors.push(error)
    }
  }

  if (module) {
    // module executor
    // Todo: rest part of Array '...[0,1]'
    if (executorName) {
      executor = module[executorName]
    } else {
      if (typeof module !== 'function') {
        if (module[moduleName]) {
          executor = module[moduleName]
        }
        if (module.executor) {
          executor = module.executor
        }
        if (module.default) {
          executor = module.default
        }
      } else {
        executor = module
      }
    }
  } else {
    if (errors.length && options.critical) {
      throw errors[errors.length - 1]
    }
  }

  return {module, executor, type: typeof executor}
}

module.exports = moduleExecutor
