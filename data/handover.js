const Data = require('./data')

class Handover {
  constructor (data, handover, handoverType = Data) {
    if (!(handover instanceof handoverType)) {
      throw new Error(`Handover must be an instance of ${handoverType.name ? handoverType.name : 'Data'}.`)
    } else {
      handover._isHandover = true
    }

    this._data = data
    this._handover = handover
  }

  get data () { return this._data }

  get handover () { return this._handover }
}

module.exports = Handover
