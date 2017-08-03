const colors = require('colors')
const path = require('path')
const hasha = require('hasha')

const File = require('./../data/file')
const Files = require('./../data/files')

const defaults = {
  color: 'yellow'
}

function _logWrongDataType (task) {
  task.log('Wrong data type. Skipping…', task.LOG_TYPE_WARNING)
}

function _check (data, task) {
  if (Files.check(data) || File.check(data)) {
    return true
  } else {
    _logWrongDataType(task)
    return false
  }
}

async function glob (data, task) {
  let {files, matches} = await Files.factory(data, task)
  return task.finish(files, matches)
}

async function add (data, task) {
  let files = data
  if (!Files.check(data, task)) {
    files = new Files()
  }

  let file = await files.add(task.config.path, task.config.options || {})
  return task.finish(files, file)
}

function remove (data, task) {
  if (_check(data, task)) {
    let file = data.remove(task.config.path, task.config.destroy)
    return task.finish(data, file)
  } else {
    return task.finish(data, null)
  }
}

function clear (data, task) {
  if (_check(data, task)) {
    data.clear(task.config.destroy)
    return data
  } else {
    return task.finish(data, null)
  }
}

function matches (data, task) {
  if (_check(data, task)) {
    let matches = new Files()
    matches.addFiles(data.matches(task.config.pattern))
    return task.finish(data, matches)
  } else {
    return task.finish(data, null)
  }
}

async function read (data, task) {
  if (_check(data, task)) {
    await data.read(task.config)
    return data
  } else {
    return task.finish(data, null)
  }
}

async function readFile (data, task) {
  if (_check(data, task)) {
    let file = await data.readFile(task.config.path, task.config.options)
    return task.finish(data, file)
  } else {
    return task.finish(data, null)
  }
}

async function write (data, task) {
  if (_check(data, task)) {
    await data.write(task.config)
    return data
  } else {
    return task.finish(data, null)
  }
}

async function writeFile (data, task) {
  if (_check(data, task)) {
    let file = await data.writeFile(task.config.path, task.config.options)
    return task.finish(data, file)
  } else {
    return task.finish(data, null)
  }
}

function move (data, task) {
  if (_check(data, task)) {
    let config = task.config
    let matches = new Files()
    for (let file of data) {
      let currentPath = file.path
      file.path = path.join(config.dest, path.relative(config.base || '', file.path))
      task.log(`${currentPath} -> ${file.path}`.gray, null)
      matches.addFile(file)
    }
    return task.finish(data, matches)
  } else {
    return task.finish(data, null)
  }
}

function size (data, task) {
  if (_check(data, task)) {
    data.log(`${data.size} ${data.size === 1 ? 'file' : 'files'}.`)
    return data
  } else {
    return task.finish(data, null)
  }
}

async function hash (data, task) {
  if (_check(data, task)) {
    for (let file of data) {
      if (file._data) {
        let options = Object.assign({algorithm: 'md5'}, task.config.options) // https://www.npmjs.com/package/hasha
        let dataHash = hasha(file._data, options)

        task.log(`Hashed ${file.path}`, null)

        file.path = path.format({
          root: file._root,
          dir: file._dir,
          name: `${file._name}.${dataHash}`,
          ext: file._ext
        })
      } else {
        task.log(`File ${file.path} has no data for hashing`, task.LOG_TYPE_WARNING)
      }
    }
  }

  return data
}

module.exports = {
  executor: glob,
  glob,
  add,
  remove,
  clear,
  matches,
  read,
  readFile,
  write,
  writeFile,
  move,
  size,
  length: size,
  hash,
  defaults
}
