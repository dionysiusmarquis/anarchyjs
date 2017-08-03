const colors = require('colors')
const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const traverse = require('traverse')
const merge = require('deepmerge')

const moduleExecutor = require('./../helper/module-executor')
const configs = {}

function _error (error) {
  if (error.name === 'YAMLException') {
    console.error('error'.red, error.message)
  }

  throw error
}

function _buildConfig (file) {
  let parentConfig = null

  let configData = fs.readFileSync(file, 'utf8')
  let extendsMatch = /#\s*extends\s+([^\n]+)/.exec(configData)
  if (extendsMatch && extendsMatch.length) {
    let parentPath = path.parse(extendsMatch[1])
    if (!parentPath.ext) {
      parentPath.base = `${parentPath.base}.yml`
      parentPath.ext = '.yml'
    }
    if (parentPath.ext !== '.yml') {
      parentPath.name = `${parentPath.name}${parentPath.ext}`
      parentPath.base = `${parentPath.base}.yml`
      parentPath.ext = '.yml'
    }

    // todo: easier relative path without './'
    let parentFile = path.format(parentPath)
    parentConfig = _buildConfig(path.resolve(path.dirname(file), path.join(parentFile)))
  }

  let config = null
  try {
    config = yaml.safeLoad(configData)
  } catch (error) {
    _error(error)
  }

  if (parentConfig) { // todo: inline config (currently in anarchyjs/Task)
    const travConfig = traverse(config)
    const travParentConfig = traverse(parentConfig)

    // merge arrays by policy
    travConfig.forEach(function (node) {
      let appendMatch = /\.{3,}\s*(.+)/.exec(this.key)
      let prependMatch = /(.+?)\s*(\.{3,})/.exec(this.key)
      let replaceMatch = /(.+?)\s*\[(\d+)]/.exec(this.key)
      let injectMatch = /(.+?)\s*{(\d+)}/.exec(this.key)

      let policy = null
      let name = null
      if (appendMatch && appendMatch.length) {
        policy = 'append'
        name = appendMatch[1]
      }
      if (prependMatch && prependMatch.length) {
        policy = 'prepend'
        name = prependMatch[1]
      }

      if (replaceMatch && replaceMatch.length) {
        policy = 'replace'
        name = replaceMatch[1]
      }

      if (injectMatch && injectMatch.length) {
        policy = 'inject'
        name = injectMatch[1]
      }

      if (policy) {
        this.remove()
        this.key = name

        let arrayPath = this.path.map((value, index) => {
          return index === this.path.length - 1 ? name : value
        })

        const parentName = this.path[this.path.length - 2]
        let targetNode =
          travConfig.get(arrayPath) ||
          travParentConfig.get(arrayPath) ||
          travConfig.get([parentName, name]) ||
          travParentConfig.get([parentName, name])

        // console.log(policy, travConfig.get(arrayPath), arrayPath, this.path)
        if (targetNode && targetNode instanceof Array) {
          let injection = node instanceof Array ? node : [node]

          if (policy === 'append') {
            this.update([...targetNode, ...injection])
          }

          if (policy === 'prepend') {
            this.update([...injection, ...targetNode])
          }

          if (policy === 'replace') {
            let targetIndex = Number(replaceMatch[2])
            if (injection.length === 1) {
              targetNode[targetIndex] = injection[0]
            } else {
              // todo
            }
            this.update(targetNode)
          }

          if (policy === 'inject') {
            // todo
          }
        } else {
          this.update(node)
        }
      }
    })

    config = merge(
      parentConfig,
      config,
      {arrayMerge: (_, src) => src}
    )
  }

  return config
}

function _importModules (config) {
  const travConfig = traverse(config)

  // Import modules
  let moduleRegExp = String.raw`->\s*(.*)`
  travConfig.forEach(function (node) {
    if (this.key) {
      if (node === null) {
        console.log(`[${'config'.yellow}] ${'(warning)'.yellow} Invalid node for key '${this.key.bold}'. Please check indentation.`)
      } else {
        if (node instanceof Array) {
          // rest array module
          // todo: partial resting (e.g. -> : ...module[0,1,])
          let restedNode = []
          for (let [, value] of node.entries()) {
            if (typeof value === 'object') {
              let name = Object.keys(value)[0]

              let regExp = new RegExp(moduleRegExp, 'g')
              let moduleMatch = regExp.exec(name)
              if (moduleMatch && moduleMatch.length) {
                let moduleNode = value[name]
                let restMatch = /\.{3,}\s*(.+)/.exec(moduleNode.module || moduleNode)
                if (restMatch && restMatch.length) {
                  let {executor, type} = moduleExecutor(restMatch[1])
                  let injection = type === 'function' ? executor(node.options || node['()']) : executor

                  if (injection instanceof Array) {
                    for (let [, value] of injection.entries()) {
                      restedNode.push(value)
                    }
                  } else {
                    throw new Error(`Cannot rest ${this.path.join('/')}.`)
                  }
                } else {
                  restedNode.push(value)
                }
              } else {
                restedNode.push(value)
              }
            } else {
              restedNode.push(value)
            }
          }

          if (restedNode.length && restedNode.length !== node.length) {
            this.update(restedNode)
          }
        } else {
          // import module
          let regExp = new RegExp(moduleRegExp, 'g')
          let moduleMatch = regExp.exec(this.key)
          let name = moduleMatch && moduleMatch.length ? moduleMatch[1] : null

          if (name !== null) {
            let {executor, type} = moduleExecutor(node.module || node)
            let injection = type === 'function' ? executor(node.options || node['()']) : executor

            this.remove()
            if (name) {
              this.key = name
              this.update(injection)
            } else {
              this.parent.update(injection)
              // this.parent.update(
              //   Object.assign(
              //     this.parent.node,
              //     injection
              //   )
              // ) ????
            }
            console.log(`[${'config'.yellow}] Imported ${[...this.path].map((value, index) => {
              return index === this.path.length - 1 ? name : value.replace('-> ', '')
            }).join('/').bold} from ${node.module || node}`)
          }
        }
      }
    }
  })

  return travConfig
}

function compile (id, configFile, personalFile = null) {
  let config = _buildConfig(configFile)

  let personalConfig = null
  try {
    personalConfig = yaml.safeLoad(fs.readFileSync(personalFile, 'utf8'))
  } catch (error) {
    _error(error)
  }

  if (personalConfig) {
    config = merge(
      config,
      personalConfig
    )
  }

  let travConfig = _importModules(config)
  configs[id] = {config, travConfig}
  return travConfig
}

function get (id, target, delimiter = '|') {
  if (target instanceof Array) {
    return configs[id].travConfig.get(target) || {}
  } else {
    return configs[id].travConfig.get(target.split(delimiter)) || {}
  }
}

module.exports = {
  compile,
  get,
  configs
}
