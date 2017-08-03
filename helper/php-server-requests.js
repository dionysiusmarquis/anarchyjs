const phpServer = require('../helper/php-server-promise')

async function phpServerRequests (requests, options = {}) {
  let server = options.server || await phpServer.create(
    Object.assign({name: 'PHP Requests'}, options)
  )

  let responses = {}
  let multipleRequests = requests instanceof Array

  if (!multipleRequests) {
    requests = [requests]
  }

  for (let request of requests) {
    options.request = request
    if (multipleRequests) {
      responses[request] = await server.request(options)
    } else {
      responses = await server.request(options)
    }
  }

  if (!options.keepServer) {
    server.close()
  }

  return {responses, server}
}

module.exports = phpServerRequests
