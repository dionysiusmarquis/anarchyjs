var mimeTypes = require('mime-types')
const colors = require('colors')
const url = require('url')
const path = require('path')

const File = require('./../data/file')
const Files = require('./../data/files')

const _files = {}

const defaults = {
  base: ''
}

function warn (fileUrl) {
  console.log(`[${'FileServe'.yellow}] ${'(warning)'.yellow} No file with url ${fileUrl} served`)
}

function executor (data, task) {
  if (!File.check(data) && !Files.check(data)) {
    return data
  }

  for (let file of data) {
    if (!file.path) {
      task.log(`Invalid url: ${file.path}`, task.LOG_TYPE_WARNING)
    } else {
      let {fileUrl, mapUrl} = add(file, task.config.base)
      task.log(`Serving file ${fileUrl}`, null)
      if (mapUrl) {
        task.log(`Serving source map ${mapUrl}`, null)
      }
    }
  }

  return data
}

async function get (data, task) {
  let url = task.handoverConfig.file || task.config.file
  if (url && has(url)) {
    let {files, matches} = await Files.factory(data, task)
    if (matches.length) {
      let file = matches[0]
      file.data = _files[url].data
    } else {
      let file = new File(url, _files[url].data)
      files.addFile(file)
      matches.addFile(file)
    }

    task.finish(files, matches)
  } else {
    task.log(`${url} not served.`)
  }

  return data
}

function add (file, base) {
  let fileUrl = `/${path.relative(base, file.path)}`
  let mapUrl = null

  // serve source map
  if (file.options.sourceMap) {
    let {url, inline} = file.getSourceMappingURL({base})
    if (url) {
      file.sourceMappingURL = url
      if (!inline) {
        mapUrl = url
        let type = mimeTypes.lookup(mapUrl)

        if (!type) {
          throw new Error(`No MIME type for source map ${mapUrl} detected.`)
        }

        _files[mapUrl] = {data: file.sourceMapString, type}
      }
    }
  }

  // serve file
  let type = mimeTypes.lookup(file.path)

  if (!type) {
    throw new Error(`No MIME type for ${fileUrl} detected.`)
  }

  _files[fileUrl] = {data: file.data, type}

  return {fileUrl, mapUrl}
}

function find (fileUrl) {
  if (fileUrl.length === 1) {
    return
  }

  fileUrl = url.parse(fileUrl).pathname
  return _files[fileUrl]
}

function has (fileUrl) {
  fileUrl = url.parse(fileUrl).pathname

  return !(!_files[fileUrl])
}

function remove (fileUrl) {
  fileUrl = url.parse(fileUrl).pathname

  if (!_files[fileUrl]) {
    warn(fileUrl)
    return
  }

  _files[fileUrl] = null
  delete _files[fileUrl]
}

function middleware (req, res, next) {
  let file = find(req.url)
  if (file) {
    console.log(`[${'FileServe'.yellow}] serve file for ${req.url.bold}`)
    res.setHeader('Content-Type', file.type)
    res.end(file.data)
  } else {
    next()
  }
}

module.exports = {
  executor,
  files: _files,
  add,
  get,
  find,
  has,
  remove,
  middleware,
  defaults
}
