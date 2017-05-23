const colors = require('colors')

const phpServer = require('./../helper/php-server-promise')

let defaults = {
  color: 'blue'
}

async function images (data) {
  let server = await phpServer.create({
    name: 'Images',
    base: 'webroot'
  })

  let response = await server.request({
    request: '/h1y57g1c5v2s6tsm5c8s'
  })

  console.log(response)

  server.close()

  return data
}

module.exports = {images, defaults}
