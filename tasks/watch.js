const colors = require('colors')
const chokidar = require('chokidar')

const Files = require('./../data/files')
const File = require('./../data/file')

const defaults = {
  color: 'yellow',
  listened: false,
  paths: [],
  files: {},
  options: {}, // https://github.com/paulmillr/chokidar#api
  listeners: ['change'] // https://github.com/paulmillr/chokidar#getting-started
}

async function _run (data, task) {
  await task.run(data)
  console.log('\n (っ°‿°)っ waiting for files to change…\n'.green.bold)
}

async function _executor (watch, task) {
  task.log(`${watch.listener.bold} ${watch.path}`, null)

  if (task.config.listened) {
    task.config.files.pattern = watch.path
    let {files, matches} = await Files.factory(null, task)
    return task.finish(files, matches)
  }

  if (File.check(watch.data) || Files.check(watch.data)) {
    watch.data.outdated = true
  }

  return watch.data
}

async function watch (data, task) {
  let config = task.config

  task._executor = _executor

  let watcher = chokidar.watch(config.path || config.paths, config.options)
  for (let listener of config.listeners) {
    watcher.on(listener, path => {
      if (!task.job.running) {
        if (path) {
          _run({data, path, listener}, task)
        }
      } else {
        task.log('Job still running. Skipping…', task.LOG_TYPE_WARNING)
      }
    })
  }

  return data
}

module.exports = {watch, defaults}
