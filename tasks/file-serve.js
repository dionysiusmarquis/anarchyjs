const colors = require('colors')
const mimeTypes = require('mime-types')
const url = require('url')
const path = require('path')

const File = require('./../data/file')
const Files = require('./../data/files')

const _cache = {}
const _aliases = {}

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
      task.log(`Serving file ${fileUrl}`.gray, null)

      if (task.config.alias && data instanceof File) {
        _aliases[task.config.alias] = fileUrl
        task.log(`Added alias '${task.config.alias}' for file ${fileUrl}`.gray, null)
      }

      if (mapUrl) {
        task.log(`Serving source map ${mapUrl}`.gray, null)
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
      file.data = _cache[url].data
    } else {
      let file = new File(url, _cache[url].data)
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

        _cache[mapUrl] = {data: file.sourceMapString, type}
      }
    }
  }

  // serve file
  let type = mimeTypes.lookup(file.path)

  if (!type) {
    throw new Error(`No MIME type for ${fileUrl} detected.`)
  }

  _cache[fileUrl] = {data: file.data, type}

  return {fileUrl, mapUrl}
}

function find (fileUrl) {
  fileUrl = url.parse(fileUrl).pathname
  let alias = _aliases[fileUrl]
  return _cache[fileUrl] || _cache[alias]
}

function has (fileUrl) {
  fileUrl = url.parse(fileUrl).pathname

  return !(!_cache[fileUrl]) || !(!_aliases[fileUrl])
}

function remove (fileUrl) {
  fileUrl = url.parse(fileUrl).pathname

  if (!_cache[fileUrl]) {
    warn(fileUrl)
    return
  }

  _cache[fileUrl] = null
  delete _cache[fileUrl]

  for (let [alias, value] of Object.entries(_aliases)) {
    if (value === fileUrl) {
      _aliases[alias] = null
      delete _aliases[alias]
    }
  }
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
  files: _cache,
  add,
  get,
  find,
  has,
  remove,
  middleware,
  defaults
}
