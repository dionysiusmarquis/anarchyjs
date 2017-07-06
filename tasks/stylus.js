const stylus = require('stylus')
const path = require('path')
const fs = require('fs-extra')

const Files = require('./../data/files')
const File = require('./../data/file')

const defaults = {
  color: 'cyan',
  dest: '',
  options: {}, // http://stylus-lang.com/docs/executable.html
  file: {},
  handover: {
    file: {
      pattern: '**/**.styl'
    }
  } // handover specific defaults
}

async function executor (data, task) {
  let config = task.config
  let {files, matches: file} = await Files.factory(data, task)

  if (file instanceof File) {
    let options = Object.assign({}, config.options)

    let styles = stylus(file.data)
    styles.set('filename', file.path)

    // set source map options
    if (options.sourcemap) {
      if (options.sourcemap === true) {
        options.sourcemap = {}
      }
      options.sourcemap.basePath = path.resolve(path.dirname(config.dest))
    }

    // set options
    Object.entries(options).forEach(([key, value]) => {
      styles.set(key, value)
    })

    // Todo: implement remaining stylus methods

    styles.define('log', arg => {
      let output = []

      switch (arg.constructor.name) {
        case 'Boolean':
        case 'String':
          output.push(arg.val)
          break

        default:
          output.push(`${arg.constructor.name}{`)

          let properties = []
          if (arg.name) {
            properties.push(`name: ${arg.name}`)
          }

          if (arg.val !== undefined) {
            properties.push(`value: ${arg.val}`)
          }

          output.push(properties.join(', '))
          output.push('}')
      }

      console.log(output.join(' '))
    })

    styles.define('log-raw', arg => console.log(arg))

    let css = styles.render()
    let map = styles.sourcemap

    // Set file source map options
    if (options.sourcemap) {
      if (options.sourcemap.inline) {
        file.options.sourceMap.inline = true
      } else {
        file.options.sourceMap.write = true
      }
    }

    // Stylus now returns sourcemap without original sources. We should glue
    // those manually. See https://github.com/stylus/stylus/issues/2036
    if (map && !map.sourcesContent) {
      map.sourcesContent = map.sources.map(source => {
        let data = ''

        try {
          data = fs.readFileSync(path.join(path.dirname(config.dest), source), 'utf8')
        } catch (error) {}

        return data
      })
    }

    file._sourceMap = map
    file.data = css
    file.path = config.dest

    return task.finish(files, file)
  } else {
    throw new Error('No valid src file found.')
  }
}

module.exports = {executor, defaults}
