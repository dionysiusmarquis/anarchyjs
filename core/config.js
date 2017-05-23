const colors = require('colors')
const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const traverse = require('traverse')
const merge = require('deepmerge')

const jobId = [...process.argv].slice(2).join('.')

const moduleExecutor = require('./../helper/module-executor')

let config = yaml.safeLoad(fs.readFileSync('jobs/config.yml', 'utf8'))

let personalConfig = yaml.safeLoad(fs.readFileSync('jobs/personal.yml', 'utf8'))
if (personalConfig) {
  config = merge(
    config,
    personalConfig
  )
}

let jobConfig = yaml.safeLoad(fs.readFileSync(`jobs/config/${jobId}.yml`, 'utf8'))
if (jobConfig) {
  config = merge(
    config,
    jobConfig
  )
}

const travConfig = traverse(config)

require('babel-register')({only: 'config/rollup/', presets: ['es2015']}) // Todo: 'only' from config

// Import modules
travConfig.forEach(function (node) {
  if (this.key) {
    if (node === null) {
      console.log(`[${'config'.yellow}] ${'(warning)'.yellow} Invalid node for key '${this.key.bold}'. Please check indentation.`)
    } else {
      let moduleMatch = /->\s*(\S*)/g.exec(this.key)
      let name = moduleMatch && moduleMatch.length ? moduleMatch[1] : null
      if (name !== null) {
        let {executor, type} = moduleExecutor(node.module || node)

        let injection = type === 'function' ? executor(node.options) : executor
        if (name === '...' && injection instanceof Array && this.parent.parent.node instanceof Array) {
          let targetArray = this.parent.parent.node
          let index = targetArray.indexOf(this.parent.node)
          this.remove()
          this.parent.remove()
          for (let [i, value] of injection.entries()) {
            targetArray.splice(index + i, 0, value)
          }
          this.parent.parent.update(targetArray)
        } else {
          this.remove()
          if (name) {
            this.key = name
            this.update(injection)
          } else {
            this.parent.update(
              Object.assign(
                this.parent.node,
                injection
              )
            )
          }
        }

        console.log(`[${'config'.yellow}] Imported ${name.bold} from ${node.module || node}`)
      }
    }
  }
})

fs.writeFileSync('logs/config.json', JSON.stringify(config, null, 2))

function get (target) {
  return travConfig.get(target.split('/')) || {}
}

module.exports = {
  config,
  get
}
