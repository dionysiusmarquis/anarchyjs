const colors = require('colors')
const prettyMs = require('pretty-ms')
const merge = require('deepmerge')

const moduleExecutor = require('./../helper/module-executor')
const Data = require('./../data/data')
const Handover = require('./../data/handover')

class Task {
  constructor (tree) {
    this.LOG_TYPE_DEBUG = 'debug'
    this.LOG_TYPE_WARNING = 'warning'
    this.LOG_TYPE_ERROR = 'error'

    this._logTypes = [this.LOG_TYPE_DEBUG, this.LOG_TYPE_WARNING, this.LOG_TYPE_ERROR]

    this._tree = tree

    // set by init
    this._id = null
    this._indent = null
    this._logPrefix = null
    this._name = null
    this._configId = null
    this._defaults = null
    this._config = null
    this._module = null
    this._executor = null
    this._tasks = null

    // Set by _buildTasksTree
    this._job = null
    this._index = null
    this._scope = null
    this._parent = null
    this._prev = null
    this._next = null

    this._iterations = 0

    // console.log(tree)
    // console.log(this)
  }

  init () {
    let defaults = null
    let tasks = null

    let taskString = null
    let inlineConfig = {}

    // Handle different tree definition types
    if (typeof this._tree === 'string') {
      taskString = this._tree
    } else {
      taskString = Object.keys(this._tree)[0]

      let taskBody = this._tree[taskString]

      if (!(taskBody instanceof Array)) {
        inlineConfig = taskBody
      } else {
        tasks = taskBody
      }
    }

    // Add inline config (eg. file=file.ext or file:file.ext with spaces file=(my file.ext) or file={my file.ext})
    let configRegEx = /([^:={}()\s]+?)\s*[=:]\s*(\(.+?\)|{.+?}|\S+)/g
    let configMatch = configRegEx.exec(taskString)
    while (configMatch !== null) {
      if (configMatch.index === configRegEx.lastIndex) {
        configRegEx.lastIndex++
      }

      let value = null
      try {
        value = JSON.parse(configMatch[2].replace(/'/g, '"'))
      } catch (error) {
        value = configMatch[2]
      }

      inlineConfig[configMatch[1]] = value

      configMatch = configRegEx.exec(taskString)
    }

    let configId = taskString.split(' ')[0]
    let configPath = configId.split('|')
    let name = configPath[0]
    let taskConfig = this._job.getConfig(configPath)
    if (this._tree[name]) {
      taskConfig = merge(
        taskConfig,
        this._tree[name] instanceof Array ? {tasks: this._tree[name]} : this._tree[name],
        {arrayMerge: (_, src) => src} // todo: different array merge policies?
      )
    }
    tasks = tasks || (taskConfig instanceof Array ? taskConfig : taskConfig.tasks)

    let {module, executor} = moduleExecutor(
      name,
      {
        critical: false,
        aliases: [{from: 'file', to: 'files'}],
        paths: [`${process.cwd()}/node_modules/anarchyjs/tasks/`, '', process.cwd()]
      }
    )

    // merge configs
    if (module && module.defaults) {
      defaults = module.defaults
      taskConfig = merge(module.defaults, taskConfig, {arrayMerge: (_, src) => src})
    }

    if (inlineConfig) {
      taskConfig = merge(taskConfig, inlineConfig, {arrayMerge: (_, src) => src})
    }

    // create handover config
    let handoverConfig = taskConfig.handover ? merge(taskConfig, taskConfig.handover, {arrayMerge: (_, src) => src}) : taskConfig
    if (handoverConfig.handover) {
      handoverConfig.handover = null
      delete handoverConfig.handover
    }

    this._id = `${this._index}`
    if (this._scope && this._scope.length) {
      this._id = `${this._scope.join(':')}:${this._id}`
    }

    this._name = name
    this._configId = configId
    this._defaults = defaults
    this._config = taskConfig
    this._handoverConfig = handoverConfig
    this._module = module
    this._executor = executor
    this._tasks = []

    let tasksConfig = this._job.getConfig('tasks')
    this._indent = this._scope ? new Array(this._scope.length + 1).join('| '.gray) : ''
    this._logPrefix = `[${colors[[this._config.color || 'cyan']](this[tasksConfig.logPrefix || 'configId'])}]`

    this._buildTaskTree(tasks)
  }

  _buildTaskTree (tasks) {
    if (!tasks) {
      return
    }

    let index = 0
    let prev = null
    for (let tree of tasks) {
      let task = new Task(tree)
      task._job = this._job
      task._index = index++
      task._scope = this._scope ? [...this._scope, task._index] : []

      task._parent = this
      task._prev = prev

      if (prev) {
        prev._next = task
      }

      prev = task

      task.init()
      this._tasks.push(task)
    }
  }

  async run (data) {
    let start = Date.now()

    // check task run condition
    if (this._config.if) {
      if (!eval(this._config.if)) {
        this.log(`${'Task condition not met. Skipping task…'.bold}`, null)
        this._iterations++
        return data
      }
    }

    try {
      if (this._module) {
        this.log(`${'executing task…'.bold}`, null)
      }

      // Run task
      let dataType = data && data.constructor ? data.constructor : null
      if (this._module && this._executor) {
        if (data instanceof Data) {
          data._currentTask = this
        }
        data = await this._executor(data, this)
        this._iterations++
      } else {
        if (this._tasks && this._tasks.length) {
          this.log(`${'executing task tree…'.bold}`, null)
        } else {
          if (!this._module) {
            this.log(`${'could not find task module.'.bold}`, this.LOG_TYPE_ERROR)
          } else {
            this.log(`${'could not find task executor.'.bold}`, this.LOG_TYPE_ERROR)
          }
        }
      }

      // Check for data type changes
      let newDataType
      if (data instanceof Handover) {
        newDataType = {name: `Handover->${data.handover.constructor.name}`}
      } else {
        newDataType = data && data.constructor ? data.constructor : null
      }

      if (newDataType !== dataType) {
        this.log(`Changed data type from ${dataType ? dataType.name : dataType} to ${newDataType ? newDataType.name : newDataType}`, null)
      }

      // Check for data loss
      if (dataType && !newDataType) {
        this.log(`Destroyed data ( •_•)`, this.LOG_TYPE_WARNING)
      }

      if (this._module) {
        this.log(`${'success!'.green} - completed in ${prettyMs(Date.now() - start).bold}`, null)
      }

      let treeData = data

      // Execute child tasks
      if (this._tasks && this._tasks.length) {
        let treeData = {}
        if (this._config.handover !== false) {
          treeData = data instanceof Handover ? data.handover : data
        }

        for (let task of this._tasks) {
          treeData = await task.run(treeData)
          if (treeData instanceof Error) {
            break
          }
        }
      }

      data = data instanceof Handover ? data.data : treeData
    } catch (error) {
      this._iterations++

      this.log(error, this.LOG_TYPE_ERROR)
      this.log(`${'(╯°□°）╯︵ ┻━┻'.bold.red} failed after' ${prettyMs(Date.now() - start).bold}`, null)

      if (this._iterations <= 1) {
        console.log(error)
        process.exit(1)
      } else {
        return error
      }
    }

    return data
  }

  finish (data, handover) {
    if (this._tasks.length) {
      return new Handover(data, handover)
    } else {
      return data
    }
  }

  log (message, type = this.LOG_TYPE_DEBUG) {
    if (!this._configId) {
      return
    }

    // handle console.log like args
    if (arguments.length > 2) {
      let args = Array.from(arguments)
      let types = this._logTypes
      type = args.filter(value => { return types.indexOf(value) !== -1 })[0] || this.LOG_TYPE_DEBUG
      message = args.filter(value => { return types.indexOf(value) === -1 })
    } else if (type !== null && this._logTypes.indexOf(arguments[1]) === -1) {
      type = this.LOG_TYPE_DEBUG
      message = Array.from(arguments)
    }

    if (message instanceof Array) {
      message = message
        .map(value => { return typeof value !== 'string' ? JSON.stringify(value, null, 2) : value })
        .join(' ')
    }

    let output = [`${this._indent}${this._logPrefix}`]
    switch (type) {
      case this.LOG_TYPE_DEBUG:
        output.push('(debug)'.gray)
        message = message.gray
        break
      case this.LOG_TYPE_WARNING:
        output.push('(warning)'.yellow)
        break
      case this.LOG_TYPE_ERROR:
        output.push('(error)'.red)
        break
    }

    output.push(message)

    console.log(output.join(' '))
  }

  get isLast () { return !this._tasks.length && !this._next }

  get isFirst () { return !this._prev }

  get id () { return this._id }

  get name () { return this._name }

  get job () { return this._job }

  get index () { return this._index }

  get configId () { return this._configId }

  get tree () { return this._tree }

  get defaults () { return this._defaults }

  get config () { return this._config }

  get handoverConfig () { return this._handoverConfig }

  get scope () { return this._scope }

  get module () { return this._module }

  get executor () { return this._executor }

  get tasks () { return this._tasks }

  get iterations () { return this._iterations }

  get parent () { return this._parent }

  get prev () { return this._prev }

  get next () { return this._next }

  get isAnarchy () { return this instanceof Task }
}

module.exports = Task
