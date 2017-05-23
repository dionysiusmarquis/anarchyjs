function wait (data, task) {
  return new Promise(
    (resolve, reject) => {
      let time = task.config.for
      data = data || {time: 0}
      setTimeout(
        () => {
          task.log(`Current time ${data.time}`, time)
          // data = task.saveData()
          if (data.time < 9000) {
            data.time += time
            resolve(data)
          } else if (data.time < 11000) {
            resolve()
          } else {
            reject('Test')
          }
        },
        time
      )
    }
  )
}

module.exports = wait
