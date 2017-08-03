const colors = require('colors')
const prettyMs = require('pretty-ms')

const Task = require('./task')

class Job {
  constructor (id, config) {
    this._id = id
    this._config = config
    this._running = false

    let jobConfig = this.getConfig('job')
    process.env.NODE_ENV = process.env.NODE_ENV || jobConfig.env

    this._task = new Task({job: jobConfig})
    this._task._job = this
    this._task.init()
  }

  async run () {
    this._running = true
    let start = Date.now()
    let data = await this._task.run()

    console.log(`\n (っ^‿^)っ done in ${prettyMs(Date.now() - start).bold}!\n`.bold.green)
    this._running = false
    return data
  }

  getConfig (target, delimiter = '|') {
    if (target instanceof Array) {
      return this._config.get(target) || {}
    } else {
      return this._config.get(target.split(delimiter)) || {}
    }
  }

  get id () { return this._id }

  get config () { return this._config }

  get task () { return this._task }

  get running () { return this._running }
}

module.exports = Job
