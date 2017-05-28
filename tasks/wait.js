function wait (data, task) {
  return new Promise(
    (resolve, reject) => {
      let time = task.config.for
      data.time = data.time || 0
      setTimeout(
        () => {
          task.log(`Current time ${data.time}`, time)
          data.time += time
          resolve(data)
        },
        time
      )
    }
  )
}

module.exports = wait
