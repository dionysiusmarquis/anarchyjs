const path = require('path')
const spawn = require('child_process').spawn
const randomPort = require('random-port')

const httpRequest = require('../helper/http-request')

const serverList = []

function create (params) {
  let defaults = {
    name: 'PHP Server',
    hostname: '127.0.0.1',
    port: null,
    base: '.',
    router: '',
    bin: 'php',
    open: false
  }

  let options = Object.assign({}, defaults, params)

  this.options = options
  this.process = null
  this.request = params => httpRequest(Object.assign({}, options, params))
  this.close = params => close(this)

  serverList.push(this)

  return new Promise(
    async (resolve, reject) => {
      try {
        'use strict'

        // Find random open port if none is provided
        if (!options.port) {
          await new Promise(
            (resolve, reject) => {
              randomPort(randomPort => {
                options.port = randomPort
                resolve()
              })
            }
          )
        }

        // Set arguments for command from options
        let host = `${options.hostname}:${options.port}`
        let args = ['-S', host]

        if (options.router) {
          args.push(options.router)
        }

        this.process = spawn(options.bin, args, {
          cwd: path.resolve(options.base),
          stdio: 'ignore'
        })

        console.log(`[${options.name.blue}] Spawned PHP server with pid ${this.process.pid}`)

        this.process.on('exit', () => {
          console.log(`[${options.name.blue}] ${('Connection closed ' + host).bold}`)
        })

        // Kill command process when exits.
        process.on('SIGINT', () => {
          this.close()
          process.exit()
        })

        process.on('exit', () => {
          this.close()
        })

        await this.request()

        console.log(`[${options.name.blue}] ${('Connected to ' + host).bold}`)

        // if (options.open) {
        //   open(`http://${host}`)
        // }

        resolve(this)
      } catch (error) {
        let errorMessage = ''
        if (error.statusCode) {
          errorMessage = `Server responded with ${String(error.statusCode).bold}`
        } else if (error.message) {
          errorMessage = String(error.cause).bold
        }

        errorMessage = `[${options.name.blue}] ${'(error)'.red} ${errorMessage}`
        reject(errorMessage)
      }
    }
  )
}

function close (server) {
  if (server.process && !server.process.killed) {
    server.process.kill()
    console.log(`[${server.options.name.blue}] Killed PHP server with pid ${server.process.pid}`)
  }

  let index = serverList.indexOf(server)
  if (index !== -1) {
    serverList.splice(index, 1)
  }
}

function closeAll () {
  [...serverList].forEach(
    server => {
      close(server)
    }
  )
}

module.exports = {
  create,
  request: server => httpRequest(server.options),
  close,
  closeAll
}
