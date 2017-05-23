const fs = require('fs-extra')
const path = require('path')

defaults = {
  color: 'yellow'
}

function _path (config) {
  return config.src || config.path || config.file || config.dir
}

async function copy (data, task) {
  await fs.copy(_path(task.config), task.config.dest, task.config.options)
  return data
}

async function createDir (data, task) {
  await fs.ensureDir(task.config.path || task.config.dir)
  return data
}

async function createFile (data, taks) {
  await fs.ensureFile(task.config.path || task.config.file)
  return data
}

async function create (data, task) {
  let src = _path(task.config)
  let parsedPath = path.parse(src)
  if (parsedPath.ext) {
    await fs.ensureFile(path)
  } else {
    await fs.ensureDir(path)
  }
  return data
}

async function remove (data, task) {
  await fs.ensureDir(_path(task.config))
  return data
}

async function empty (data, task) {
  await fs.emptyDir(task.config.path || task.config.dir)
  return data
}

module.exports = {
  copy,
  create,
  createFile,
  createDir,
  mkdir: createDir,
  mkdirp: createDir,
  empty,
  clear: empty,
  defaults
}
