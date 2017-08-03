const colors = require('colors')
const url = require('url')
const path = require('path')

const File = require('./../data/file')
const Files = require('./../data/files')
const phpServerRequests = require('./../helper/php-server-requests')

const defaults = {
  color: 'blue',
  host: '',
  dest: '',
}

async function executor (data, task) {
  let config = task.config
  let {files} = await Files.factory(data, task)
  let staticFiles = new Files(task)

  let requests = ['/api/page/projects', '/api/children/projects']
  let {responses, server} = await phpServerRequests(requests, {
    name: 'Static',
    base: 'webroot',
    keepServer: true,
  })

  let projects = JSON.parse(responses['/api/page/projects'])
  let projectPages = JSON.parse(responses['/api/children/projects'])

  // console.log(projectPages)

  if (projects.projectgrid && projects.projectgrid.length) {
    requests = ['/']
    projects.projectgrid.forEach(
      project => {
        let projectUrl = projectPages.find(item => item.id === project.project).url
        if (projectUrl) {
          requests.push(`${url.parse(projectUrl).pathname}/content`)
        }
      }
    )

    let {responses} = await phpServerRequests(requests, {
      server,
      name: 'static|content',
      base: 'webroot',
      transform: (body, response, resolveWithFullResponse) => {
        return body
          .replace(new RegExp(response.headers.host, 'g'), config.host)
          .replace(new RegExp(`/content/assets/`, 'g'), `/`)
      }
    })

    for (let [pathname, data] of Object.entries(responses)) {
      let dest = path.join(config.dest, pathname, 'index.html')
      let file = new File(dest, data, task)
      files.addFile(file)
      staticFiles.addFile(file)
    }
  } else {
    throw new Error('No projects found.')
  }

  return task.finish(files, staticFiles)
}

module.exports = {executor, defaults}
