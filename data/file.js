const fs = require('fs-extra')
const path = require('path')
const merge = require('deepmerge')

const Data = require('./data')

let defaults = {
  sourceMap: {
    write: false,
    inline: false,
    base: ''
  },
  lowercase: false,
  read: 'utf8',
  write: {
    mkdir: true,
    flag: 'w'
  }
}

class File extends Data {
  constructor (filePath, data = null, task = null, options = {}) {
    super(data, task, options)

    if (!filePath) {
      throw new Error('Path is not valid.')
    }

    this._history = []
    this._path = null
    this._root = null
    this._dir = null
    this._base = null
    this._ext = null
    this._name = null
    this._sourceMap = null
    this.path = filePath

    this.options = options

    if (data) {
      this._history = [null, ...this._history]
    }
  }

  async read (options = {}) {
    this.data = await fs.readFile(this._path, options.read || this._options.read)
    return this._data
  }

  async writeWithData (data, options = {}) {
    this.data = data
    await this.write(options)
  }

  async write (options = {}) {
    if (!this._data) {
      throw new Error('No data.')
    }

    if (!this._modified && this._history.length <= 1) {
      this.log(`${this.path} not changed. Skipping…`, null)
      return
    }

    options = merge(this._options, options)

    if (options.write.mkdir) {
      await fs.ensureDir(path.dirname(this._path))
    }

    if (options.lowercase) {
      this.lowercase()
    }

    if (options.sourceMap) {
      let {path, url, inline} = this.getSourceMappingURL(options.sourceMap)
      if (url) {
        this.sourceMappingURL = url
        if (!inline) {
          await fs.writeFile(path, this.sourceMapString, options.write)
        }
      }
    }

    await fs.writeFile(this._path, this._data, options.write)

  }

  destroy () {
    super.destroy()
    this._history = null
    this._path = null
    this._sourceMap = null
  }

  lowercase () {
    this._path = `${path.dirname(this._path)}/${path.basename(this._path).toLowerCase()}`
  }

  relative (from) {
    return path.relative(from, this._path)
  }

  getSourceMappingURL (options = null) {
    let sourceMapPath = `${this._path}.map`

    if (!this._sourceMap) {
      return {path: sourceMapPath, url: null, inline: false}
    }

    if (!options) {
      options = this._options.sourceMap
    } else if (options === true) {
      options = {write: true}
    } else {
      options = merge(this._options.sourceMap, options)
      options.write = true
    }

    if (options.inline) {
      return {
        path: sourceMapPath,
        url: `data:application/json;charset=utf-8;base64,${new Buffer(this.sourceMapString).toString('base64')}`,
        inline: true
      }
    } else if (options && options.write) {
      return {
        path: sourceMapPath,
        url: path.join('/', options.base ? path.relative(options.base, sourceMapPath) : sourceMapPath),
        inline: false
      }
    }

    return {path: sourceMapPath, url: null, inline: false}
  }

  set path (value) {
    if (this._path !== value) {
      this._history.push(this._path)
    }
    this._path = value

    let {dir, root, base, name, ext} = path.parse(value)
    this._dir = dir
    this._root = root
    this._base = base
    this._name = name
    this._ext = ext
  }

  set options (options) {
    this._options = merge(defaults, options)
  }

  get options () { return this._options }

  set sourceMappingURL (url) {
    if (url) {
      let sourceMapRegex = /[@#][\s\t]+sourceMappingURL=\S+/g
      let hasComment = sourceMapRegex.test(this._data)

      if (!hasComment) {
        switch (path.extname(this._path)) {
          case '.js':
            this._data += `\n//# sourceMappingURL=${url}`
            break

          case '.css':
            this._data += `\n/*# sourceMappingURL=${url} */`
            break
        }
      } else {
        this.data = this._data.replace(sourceMapRegex, `# sourceMappingURL=${url}`)
      }
    }
  }

  get sourceMapString () {
    return JSON.stringify(this._sourceMap)
  }

  get path () { return this._path }

  get root () { return this._root }

  get dir () { return this._dir }

  get base () { return this._base }

  get ext () { return this._ext }

  get name () { return this._ext }

  get sourceMap () { return this._sourceMap }

  get history () { return this._history }

  get length () { return 1 }

  get size () { return 1 }

  static check (data) {
    return data instanceof File
  }

  static async factory (data = null, task = null) { // Todo: add handover etc.
    let file = null
    if (File.check(data)) {
      file = data
      file._currentTask = task
    } else {
      file = new File(task.config.file, null, task)
      await file.read(task.config.read)
    }

    return file
  }

  * [Symbol.iterator] () { yield this }
}

module.exports = File
