const fileSize = require('filesize')
const boxen = require('boxen')
const colors = require('colors')
const gzip = require('gzip-size')

const File = require('./../data/file')
const Files = require('./../data/files')

let saved = []

let defaults = {
  render: false,
  output: {
    fileSize: {}, // https://www.npmjs.com/package/filesize#optional-settings
    theme: 'dark',
    primaryColor: null,
    secondaryColor: null
  },
  boxen: {
    padding: 1
  } // https://www.npmjs.com/package/boxen#options
}

function _getText (input, size, gzipSize, options) {
  const primaryColor = options.primaryColor || colors[options.theme === 'dark' ? 'green' : 'black']
  const secondaryColor = options.secondaryColor || colors[options.theme === 'dark' ? 'yellow' : 'blue']

  return `${input.path ? primaryColor.bold('Destination: ') + secondaryColor(input.path) : primaryColor.bold(input)}
${primaryColor.bold('Size: ') + secondaryColor(fileSize(size, options.fileSize))}, ${primaryColor.bold('Gzipped size: ') + secondaryColor(fileSize(gzipSize, options.fileSize))}`
}

function output (file, options) {
  let size = Buffer.byteLength(file.data)
  let gzipSize = gzip.sync(file.data)

  return {
    text: _getText(file, size, gzipSize, options),
    size,
    gzipSize
  }
}

function render (data, task) {
  if (!saved.length) {
    return
  }

  let totalSize = 0
  let totalGzipSize = 0

  if(saved.length > 1) {
    saved.push('result')
  }

  console.log(boxen(
    saved
      .map(
        file => {
          if (file === 'result') {
            return _getText('Total Size:', totalSize, totalGzipSize, task.config.output)
          } else {
            let {text, size, gzipSize} = output(file, task.config.output)

            totalSize += size
            totalGzipSize += gzipSize

            return text
          }
        }
      )
      .join('\n\n'),
    task.config.boxen
  ))
  saved = []

  return data
}

function append (data, task) {
  if (!File.check(data) && !Files.check(data)) {
    return data
  }

  for (let file of data) {
    saved.push(file)
  }

  if (task.config.render) {
    render(data, task)
  }

  return data
}

module.exports = {
  executor: append,
  render,
  append,
  defaults
}
