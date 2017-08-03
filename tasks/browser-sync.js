const browserSync = require('browser-sync')

const File = require('./../data/file')
const Files = require('./../data/files')

const moduleExecutor = require('./../helper/module-executor')

const defaults = {
  color: 'blue',
  name: 'browsersync',
  options: {
    logPrefix: 'browser-sync'
  } // https://www.browsersync.io/docs/options
}

async function executor (data, task) {
  let options = task.config.options

  let bs = browserSync.create(task.config.name)

  if (options.middleware) {
    if (typeof options.middleware === 'string') {
      let {executor} = moduleExecutor(options.middleware)
      options.middleware = executor
    }

    if (options.middleware instanceof Array) {
      for (let [index, value] of options.middleware.entries()) {
        if (typeof value === 'string') {
          let {executor} = moduleExecutor(value)
          options.middleware[index] = executor
        }
      }
    }
  }

  await new Promise(
    (resolve) => {
      bs.init(options,
        error => {
          if (error) {
            throw error
          } else {
            resolve()
          }
        })
    }
  )

  return data
}

function reload (data, task) {
  let name = task.config.name

  if (!browserSync.has(name)) {
    task.log('No BrowserSync instance found. Execute \'browser-sync\' task first.', task.LOG_TYPE_WARNING)
    return data
  }

  if (!File.check(data) && !Files.check(data)) {
    return data
  }

  browserSync.get(name).reload([...data].map(file => file.path))

  return data
}

module.exports = {
  executor,
  reload,
  defaults
}
