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

async function _run (watch, task) {
  await task.run(task.config.handover ? watch.path : watch.data)
  console.log('\n (っ°‿°)っ waiting for files to change…\n'.green.bold)
}

async function _executor (data, task) {
  if(task.config.handover) {
    task.config.files.pattern = data
    let {files, matches} = await Files.factory(null, task)
    return task.finish(files, matches)
  }
  
  return data
}

async function watch (data, task) {
  let config = task.config

  task._executor = _executor

  let watcher = chokidar.watch(config.path || config.paths, config.options)
  for (let listener of config.listeners) {
    watcher.on(listener, path => { if (path) { _run({data, path}, task) } })
  }

  return data
}

module.exports = {watch, defaults}
