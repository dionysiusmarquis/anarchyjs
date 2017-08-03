class Data {
  constructor (data = null, task = null, options = {}) {
    this._currentTask = task
    this._isHandover = false
    this._modified = !(!data)

    this._data = data
    this._options = options
  }

  static check (data) {
    return data instanceof Data
  }

  static factory (data) {
    if (!Data.check(data)) {
      return new Data(data)
    }

    return data
  }

  log (message, type = 'debug') {
    if (this._currentTask) {
      this._currentTask.log(`Data: ${message}`, type)
    } else {
      console.log(`Data: ${type ? '(' + type + ')' : ''} ${message}`)
    }
  }

  destroy () {
    super.destroy()
    this._currentTask = null
    this._data = null
    this._options = null
  }

  [Symbol.iterator] () {
    this.log('Your data type should implement a Symbol.iterator.', 'warning')
    return []
  }

  get data () { return this._data }

  set data (value) {
    if (this._data !== null) {
      this._modified = true
    }
    this._data = value
  }

  get currentTask () { return this._currentTask }

  get isHandover () { return this._isHandover }

  get modified () { return this._modified }

  get options () { return this._options }

  get isAnarchy () { return this instanceof Data }
}

module.exports = Data
