/**
 * Created by hhey on 29.04.17.
 */

const request = require('request-promise')

function _wait (time) {
  return new Promise(
    (resolve, reject) => {
      setTimeout(
        () => resolve(),
        time
      )
    }
  )
}

function httpRequest (params, tries = 0) {
  let defaults = {
    name: 'HTTP Request',
    hostname: '127.0.0.1',
    uri: null,
    request: '',
    port: null,
    tries: 10
  }

  let options = Object.assign({}, defaults, params)

  return new Promise(
    async (resolve, reject) => {
      if (!options.uri && typeof options.request !== 'string') {
        reject('options.uri or options.request is required')
        return
      }

      if (options.request || options.request === '') {
        options.uri = `http://${options.hostname}${options.port ? ':' + options.port : ''}${options.request}`
      }

      try {
        tries++

        console.log(`[${options.name.blue}] Send request: ${options.uri} …`)

        let response = await request(options)

        resolve(response)
      } catch (error) {
        if (tries < options.tries) {
          let errorMessage = ''
          try {
            if (error.statusCode) {
              errorMessage = `Server responded with ${String(error.statusCode).bold}`
            } else if (error.message) {
              errorMessage = String(error.cause).bold
            }

            console.log(`[${options.name.blue}] ${'(warning)'.yellow} ${errorMessage}`)
            console.log(`[${options.name.blue}] ${options.tries - tries} tries left. Retrying …`)

            await _wait(1000)
            let response = httpRequest(options, tries)
            resolve(response)
          } catch (error) {
            reject(error)
          }
        } else {
          reject(error)
        }
      }
    }
  )
}

module.exports = httpRequest
