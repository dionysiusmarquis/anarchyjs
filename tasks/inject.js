const path = require('path')

const Files = require('./../data/files')
const File = require('./../data/file')

const injections = {}

const defaults = {
  color: 'yellow',
  dest: '',
  base: '',
  handover: {}
}

function _regEx (type) { return new RegExp(String.raw`([^\S\n]*)(<!-{2,}\s*inject:${type}\s*-{2,}>)[\S\s]*?(\s*<!-{2,}\s*end:${type}\s*-{2,}>)`) }

function _add (injections, type, data) {
  if (!injections[type]) {
    injections[type] = []
  }

  injections[type].push(data)
}

async function inject (data, task) {
  let config = task.config
  let {files, matches} = await Files.factory(data, task)
  let injectionFile = matches

  if (injectionFile instanceof File) {
    let injections = {}

    for (let file of files) {
      let type = path.extname(file.path).replace('.', '')
      let regExp = _regEx(type)

      let filePath = config.base ? path.relative(config.base, file.path) : file.path

      if (regExp.test(injectionFile._data)) {
        switch (type) {
          case 'js':
            _add(injections, type, `<script src="/${filePath}"></script>`)
            break
          case 'css':
            _add(injections, type, `<link rel="stylesheet" href="/${filePath}">`)
            break
          default:
            _add(injections, type, file.data)
        }

      }
    }

    for (let [type, items] of Object.entries(injections)) {
      let regExp = _regEx(type)
      injectionFile.data = injectionFile._data.replace(regExp, `$1$2\n$1${items.join('\n$1')}$3`)
      task.log(`${items.length} ${items.length === 1 ? 'injection' : 'injections'} from type ${type}`, null)
    }

    return task.finish(files, injectionFile)
  } else {
    throw new Error('Injection file not found.')
  }
}

module.exports = {inject, defaults}
