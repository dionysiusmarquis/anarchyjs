const svgo = require('svgo')
const path = require('path')

const Files = require('./../data/files')

const defaults = {
  base: '',
  color: 'magenta',
  options: {}, // https://github.com/svg/svgo
  files: {},
  handover: {
    files: {
      pattern: '**/**.svg'
    }
  }
}


/*
 promise wrapper until svgo promisify is available via npm
 (https://github.com/svg/svgo/commit/d74f6a0e2ff3f9221991082f13cfa72e13a6438c)
 */
function svgoPromise (instance, data) {
  return new Promise(
    (resolve, reject) => {
      instance.optimize(data,
        result => {
          if (result.error) {
            reject(result.error)
          } else {
            resolve(result)
          }
        }
      )
    }
  )
}

async function executor (data, task) {
  let config = task.config
  let {files, matches} = await Files.factory(data, task)

  const svgoInstance = new svgo(config.options)

  for (let file of matches) {
    let svg = await svgoPromise(svgoInstance, file.data)

    file.data = svg.data
  }

  return task.finish(files, matches)
}

module.exports = {executor, defaults}
