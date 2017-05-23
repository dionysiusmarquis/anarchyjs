function requireModules (modules) {
  let requiredModules = []

  for (let toRequire of modules) {
    let module = null
    let options = null

    if (typeof toRequire === 'string') {
      module = toRequire
    } else {
      module = Object.keys(toRequire)[0]
      options = toRequire[module].options
    }

    requiredModules.push(options ? require(module)(options) : require(module))
  }

  return requiredModules
}

module.exports = requireModules
