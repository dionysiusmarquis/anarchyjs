/**
 * Created by hhey on 29.04.17.
 */

const request = require('request-promise')

function _wait (time) {
  return new Promise(
    (resolve) => {
      setTimeout(
        () => resolve(),
        time
      )
    }
  )
}

async function httpRequest (params, tries = 0) {
  let defaults = {
    name: 'HTTP Request',
    hostname: '127.0.0.1',
    uri: null,
    request: '',
    port: null,
    tries: 10,
    wait: 1000
  }

  let options = Object.assign({}, defaults, params)

  if (!options.uri && typeof options.request !== 'string') {
    throw new Error('options.uri or options.request is required')
  }

  if (options.request || options.request === '') {
    options.uri = `http://${options.hostname}${options.port ? ':' + options.port : ''}${options.request}`
  }

  try {
    tries++

    console.log(`[${options.name.blue}] Send request: ${options.uri} …`)

    return await request(options)
  } catch (error) {
    if (tries < options.tries) {
      let errorMessage = ''

      if (error.statusCode) {
        errorMessage = `Server responded with ${String(error.statusCode).bold}`
      } else if (error.message) {
        errorMessage = String(error.cause).bold
      }

      console.log(`[${options.name.blue}] ${'(warning)'.yellow} ${errorMessage}`)
      console.log(`[${options.name.blue}] ${options.tries - tries} tries left. Retrying …`)

      await _wait(options.wait)
      await httpRequest(options, tries)
    } else {
      throw new Error(error)
    }
  }
}

module.exports = httpRequest
