const path = require('path')

const Files = require('./../data/files')
const File = require('./../data/file')

const defaults = {
  color: 'yellow',
  clean: false,
  dataUrl: ['jpg', 'jpeg', 'png', 'gif'],
  dest: '',
  base: '',
  handover: {}
}

function _regEx (type) { return new RegExp(String.raw`([^\S\n]*)(<!-{2,}\s*inject:${type}\s*-{2,}>)[\S\s]*?(\s*<!-{2,}\s*endinject\s*-{2,}>)`) }

function _regExFile (path) { return new RegExp(String.raw`([^\S\n]*)(<!-{2,}\s*inject:${path}\s*-{2,}>)`, 'g') }

function _add (injections, type, data) {
  if (!injections[type]) {
    injections[type] = []
  }

  injections[type].push(data)
}

async function inject (data, task) {
  // todo: use magic-string https://github.com/Rich-Harris/magic-string
  // todo: inject to multiple files
  let config = task.config
  let {files, matches} = await Files.factory(data, task)
  let injectionFile = matches

  if (injectionFile instanceof File) {
    let injections = {}

    for (let file of files) {
      let type = path.extname(file.path).replace('.', '')
      let regExp = _regEx(type)
      let rexExpFile = _regExFile(file.path)

      let filePath = config.base ? path.relative(config.base, file.path) : file.path

      if (rexExpFile.test(injectionFile._data)) {
        let asDataUrl = task.config.dataUrl.indexOf(file.ext) !== -1
        injectionFile.data = injectionFile._data.replace(rexExpFile, `$1${asDataUrl ? file.dataUrl : file.data}`)
        task.log(`${injectionFile.path}: injected file ${asDataUrl ? 'data url' : 'contents'} ${file.path}`.gray, null)
      } else if (regExp.test(injectionFile._data)) {
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
      injectionFile.data = config.clean
        ? injectionFile._data.replace(regExp, `$1${items.join('\n$1')}`)
        : injectionFile._data.replace(regExp, `$1$2\n$1${items.join('\n$1')}$3`)
      task.log(`${injectionFile.path}: ${items.length} ${items.length === 1 ? 'injection' : 'injections'} from type ${type}`.gray, null)
    }

    return task.finish(files, injectionFile)
  } else {
    throw new Error('Injection file not found.')
  }
}

module.exports = {inject, defaults}
