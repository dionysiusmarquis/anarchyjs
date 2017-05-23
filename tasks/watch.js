const colors = require('colors')
const chokidar = require('chokidar')

const Files = require('./../data/files')

const defaults = {
  color: 'yellow',
  handover: true,
  paths: [],
  files: {},
  options: {}, // https://github.com/paulmillr/chokidar#api
  listeners: ['change'] // https://github.com/paulmillr/chokidar#getting-started
}

async function _run (task, path) {
  await task.run(path)
  console.log('\n (っ°‿°)っ waiting for files to change…\n'.green.bold)
}

async function _executor (path, task) {
  if(task.config.handover) {
    task.config.files.pattern = path
    let {files, matches} = await Files.factory(null, task)
    return task.finish(files, matches)
  } else {
    return {}
  }
}

async function watch (data, task) {
  let config = task.config

  task._executor = _executor

  let watcher = chokidar.watch(config.path || config.paths, config.options)
  for (let listener of config.listeners) {
    watcher.on(listener, path => { if (path) { _run(task, path) } })
  }

  return data
}

module.exports = {watch, defaults}
