const phpServer = require('./../helper/php-server-promise')

const defaults = {
  color: 'blue',
  options: {}
}

async function executor (data, task) {
  await phpServer.create(task.config.options)
  return data
}

module.exports = {executor, defaults}
