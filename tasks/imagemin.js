const fileSize = require('filesize')
const colors = require('colors')
const imagemin = require('imagemin')
const plur = require('plur')

const Files = require('./../data/files')

const defaults = {
  base: '',
  color: 'magenta',
  options: {}, // https://github.com/imagemin/imagemin
  files: {},
  buffer: true,
  handover: {
    files: {
      pattern: '**/*.{jpg,jpeg,png,gif}'
    }
  }
}

async function executor (data, task) {
  let config = task.config
  let {files, matches} = await Files.factory(data, task)

  let totalBytes = 0
  let totalSavedBytes = 0
  let totalFiles = 0

  for (let file of matches) {
    const originalSize = file.data.length

    file.data = await imagemin.buffer(file.data, config.options)

    // from https://github.com/sindresorhus/gulp-imagemin todo: make global log for optimizing tasks?
    const optimizedSize = file.data.length
    const saved = originalSize - optimizedSize
    const percent = originalSize > 0 ? (saved / originalSize) * 100 : 0
    const msg = saved > 0 ? `saved ${fileSize(saved, config.fileSize)} - ${percent.toFixed(1).replace(/\.0$/, '')}%` : 'already optimized'

    if (saved > 0) {
      totalBytes += originalSize
      totalSavedBytes += saved
      totalFiles++
    }

    if (config.verbose) {
      task.log(`${'✔ '.green} ${file.relative} ${msg.gray}`, null)
    }
  }

  const percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0
  let msg = `Minified ${totalFiles} ${plur('image', totalFiles)}`

  if (totalFiles > 0) {
    msg += ` (saved ${fileSize(totalSavedBytes, config.fileSize)} - ${percent.toFixed(1).replace(/\.0$/, '')}%)`.gray
  }

  task.log(msg, null)

  return task.finish(files, matches)
}

module.exports = {executor, defaults}
