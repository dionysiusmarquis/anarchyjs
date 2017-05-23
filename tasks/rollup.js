const colors = require('colors')
const rollup = require('rollup')
const path = require('path')

const Files = require('./../data/files')
const File = require('./../data/file')

const caches = {}

const defaults = {
  color: 'cyan',
  dest: '',
  options: {}, // https://github.com/rollup/rollup/wiki/JavaScript-API
  files: {
    globFiles: false
  },
  handover: {} // handover specific defaults
}

async function executor (data, task) {
  let config = task.config
  let {files} = await Files.factory(data, task)

  let options = Object.assign({}, config.options)

  if (!task.iterations) {
    options.onwarn = warning => log(task, warning, 'warning')
  } else {
    options.onwarn = () => {}
  }

  options.cache = caches[task.id]

  let bundle = await rollup.rollup(options)
  caches[task.id] = bundle

  let {code, map} = bundle.generate(options)

  // Set file source map options
  let fileOptions = {}
  if (options.sourceMap) {
    if (options.sourceMap === 'inline') {
      fileOptions.sourceMap = {inline: true}
    } else {
      fileOptions.sourceMap = {write: true}
    }
  }

  let file = new File(options.dest, code, task, fileOptions)
  file._sourceMap = map
  files.addFile(file)

  return task.finish(files, file)
}

function log (task, message, type = 'error') {
  let messageParts = []
  if (type === 'warning') messageParts.push(String(message.message).bold)
  if (message.url) messageParts.push(message.url)
  if (message.url) messageParts.push(`${message.loc.file} (${message.loc.line}:${message.loc.column})`)
  if (message.frame) messageParts.push(message.frame)

  task.log(messageParts.join('\n'), type)
}

module.exports = {executor, defaults}
