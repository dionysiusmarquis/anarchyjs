const colors = require('colors')
const prettyMs = require('pretty-ms')

const config = require('./config').get('job')
const Task = require('./task')

process.env.NODE_ENV = process.env.NODE_ENV || config.env

async function job () {
  let start = Date.now()

  let job = new Task({job: config})
  job.init()
  let data = await job.run()

  console.log(`\n (っ^‿^)っ done in ${prettyMs(Date.now() - start).bold}!\n`.bold.green)

  return data
}

job()
