const glob = require('globby')
const merge = require('deepmerge')
const multimatch = require('multimatch')
const path = require('path')

const Data = require('./data')
const File = require('./file')

let defaults = {
  // pattern: '**',
  pattern: null,
  globFiles: true,
  readFiles: true,
  writeFiles: true,
  glob: {},
  file: {}
}

class Files extends Data {
  constructor (task, options = {}) {
    super(new Map(), task, options)

    this.options = options
  }

  static check (data) {
    return data instanceof Files
  }

  static async factory (data = {}, task = null) {
    let isHandover = data && data.isHandover

    let options = (
      isHandover ? (task.handoverConfig.files || task.handoverConfig.file) : (task.config.files || task.config.file)
    ) || {}

    let files = null
    let matchingFiles = null
    let matches = null

    // get pattern
    if (typeof options === 'string' || options instanceof Array) {
      options = {pattern: options}
    }

    if (task.config.buffer) {
      if (!options.file) {
        options.file = {}
      }
      options.file.read = {
        encoding: null
      }
    }

    // console.log(options)

    // find matches
    if (isHandover) {
      if (File.check(data)) {
        files = new Files()
        files.addFile(data)
      } else if (Files.check(data)) {
        files = data
      } else {
        files = new Files()
      }
      matchingFiles = files.matches(options.pattern)
    } else {
      if (File.check(data)) {
        files = new Files()
        files.addFile(data)
        matchingFiles = files.matches(options.pattern)
      } else if (Files.check(data)) {
        files = data
        matchingFiles = await files.glob(options)
      } else {
        files = new Files()
        matchingFiles = await files.glob(options)
      }
    }

    if (matchingFiles.length > 1) {
      matches = new Files()
      matches.addFiles(matchingFiles)
    } else if (matchingFiles.length === 1) {
      matches = matchingFiles[0]
    } else {
      matches = new Files()
    }

    files._currentTask = task
    matches._currentTask = task

    if (options.globFiles && options.pattern) {
      files.log(`${matches.length} file ${matches.length === 1 ? 'match' : 'matches'} found.`, null)
    }

    return {files, matches}
  }

  _logNoFile (path) {
    this.log(`File ${path} not found.`)
  }

  async glob (options = {}) {
    options = merge(this._options, options)

    if (options.globFiles && options.pattern) {
      let paths = await glob(options.pattern, options.glob)
      let matches = this.matches(options.pattern)
      let matchedPaths = matches.map(file => file._path)

      let files = []
      for (let path of paths) {
        if (matchedPaths.indexOf(path) === -1) {
          let file = this._data.get(path)
          if (!file) {
            file = await this.add(path, options)
          } else {
            await file.reset(options.file.read)
          }
          files.push(file)
        }
      }

      matches.forEach(async file => await file.reset(options.file.read))

      return [...matches, ...files]
    }

    return []
  }

  async add (path, options = {}) {
    options = merge(this._options, options)

    let file = new File(path, null, this._currentTask, options.file)
    this._data.set(path, file)

    if (options.readFiles) {
      await file.read(options.file.read)
    }

    return file
  }

  addFile (file) {
    if (file instanceof File) {
      this._data.set(file.path, file)
    } else {
      this.log(`Not an instance of File.`)
    }

    return file
  }

  addWithData (path, data, options = {}) {
    options = merge(this._options, options)

    let file = new File(path, data, this._currentTask, options.file)
    this._data.set(path, file)

    return file
  }

  addFiles (files) {
    for (let file of files) {
      this.addFile(file)
    }
  }

  remove (path, destroy = false) {
    let file = this._data.get(path)
    if (file) {
      if (destroy) {
        file.destroy()
      }
      this._data.delete(path)
    }

    return file
  }

  clear (destroy = false) {
    if (destroy) {
      for (let file of this) {
        file.destroy()
      }
    }

    this.data = new Map()
  }

  matches (pattern = null) {
    let matches = []
    for (let file of this) {
      if (multimatch(file.path, pattern || '**').length) {
        file._currentTask = this._currentTask
        matches.push(file)
      }
    }
    return matches
  }

  setData (target, data) {

  }

  async read (options = {}) {
    options = merge(this._options.file.read, options)
    for (let file of this) {
      file._currentTask = this._currentTask
      await file.read(options)
    }
  }

  async readFile (path, options = {}) {
    options = merge(this._options.file.read, options)

    let file = this._data.get(path)
    if (file) {
      await file.read(options)
    } else {
      this._logNoFile(path)
    }

    return file
  }

  async write (options = {}) {
    if (!this._options.writeFiles) {
      this.log('Writing files disabled. Skipping…', null)
      return
    }

    if (!this.size) {
      this.log('No files to write. Skipping…', null)
      return
    }

    this.log(`Writing ${this.size} ${this.size === 1 ? 'file' : 'files'}.`, null)

    options = merge(this._options.file, options)

    for (let file of this) {
      file._currentTask = this._currentTask
      if (options.dest) {
        file.path = options.base ? path.join(options.dest, file.relative(options.base)) : options.dest
      }
      await file.write(options)
    }
  }

  async writeFileWithData (path, data, options = {}) {
    options = merge(this._options.file, options)

    let file = this._data.get(path)
    if (file) {
      await file.writeWithData(data, options)
    } else {
      this._logNoFile(path)
    }

    return file
  }

  async writeFile (path, options = {}) {
    options = merge(this._options.file, options)

    let file = this._data.get(path)
    if (file) {
      await file.write(options)
    } else {
      this._logNoFile(path)
    }

    return file
  }

  [Symbol.iterator] () { return this._data.values() }

  set options (options) {
    this._options = merge(defaults, options)
  }

  set outdated (value) {
    for (let file of this) {
      file.outdated = value
    }
  }

  get length () { return this._data.size }

  get size () { return this._data.size }
}

module.exports = Files
