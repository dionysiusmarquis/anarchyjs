const colors = require('colors')
const sharp = require('sharp')
const plur = require('plur')

const Files = require('./../data/files')

const defaults = {
  base: '',
  color: 'magenta',
  options: {}, // http://sharp.dimens.io/en/stable/api-constructor/#sharp
  queue: [], // http://sharp.dimens.io/en/stable/
  files: {},
  buffer: true,
  verbose: false,
  handover: {
    files: {
      pattern: '**/*.{jpg,jpeg,png,gif,svg}'
    }
  }
}

async function executor (data, task) {
  let config = task.config
  let {files, matches} = await Files.factory(data, task)

  let numTransformed = 0

  if (config.queue.length) {
    for (let file of matches) {
      let fileExt = file.ext
      let newFileExt = fileExt
      let filePath = file.path
      let image = sharp(file.data, config.options)

      let fileData = null
      for (let [, exec] of config.queue.entries()) {
        let transform = Object.keys(exec).filter(key => key !== 'then')[0]
        let options = exec[transform]

        newFileExt = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'raw', 'svg'].indexOf(transform) !== -1 ? transform : fileExt

        if (transform === 'jpg') {
          transform = 'jpeg'
        }

        if (!image[transform]) {
          throw new Error(`no sharp transform named ${transform} found`)
        }
        fileData = await image[transform](options)

        if (exec.then) { // todo test
          fileData = await exec.then(fileData, exec.then.options || exec.then['()'])
        }
      }

      if (fileData) {
        numTransformed++

        file.data = await fileData.toBuffer()
        file.ext = newFileExt

        if (config.verbose) {
          if (newFileExt !== fileExt) {
            task.log(`Image transform ${filePath} -> ${file.path}`.gray, null)
          } else {
            task.log(`Image transform ${file.path}`.gray, null)
          }
        }
      }
    }
  }

  if (numTransformed > 0) {
    task.log(`Transformed ${numTransformed} ${plur('image', numTransformed)}`.gray, null)
  }

  return task.finish(files, matches)
}

module.exports = {executor, defaults}
