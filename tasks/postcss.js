const postcss = require('postcss')
const path = require('path')

const requireModules = require('./../helper/require-modules')
const Files = require('./../data/files')

const defaults = {
  color: 'cyan',
  dest: '',
  base: '',
  options: {}, // https://www.npmjs.com/package/postcss#options
  plugins: [], // https://www.npmjs.com/package/postcss#plugins
  files: {},
  handover: {
    files: {
      pattern: '**/**.css'
    }
  } // handover specific defaults
}

async function executor (data, task) {
  let config = task.config
  let {files, matches} = await Files.factory(data, task)

  if (!matches.size) {
    return data
  }

  let plugins = requireModules(config.plugins)

  // process files
  for (let file of matches) {
    let options = Object.assign({}, config.options)

    // Set file source map options
    if (options.map) {
      if (options.map.inline) {
        file.options.sourceMap.inline = true
        options.map.inline = false
      } else {
        file.options.sourceMap.write = true
      }
    }

    // Add previous source map
    if (file.sourceMap) {
      if (!options.map) {
        options.map = {}
      }

      options.map.prev = file.sourceMap
      options.map.annotation = false
    }

    let {css, map} = await postcss(plugins).process(file.data, options)

    if (map) {
      file._sourceMap = map.toJSON()
    }

    file.data = css
  }

  // finish task
  return task.finish(files, matches)
}

module.exports = {executor, defaults}
