const fs = require('fs-extra')
const path = require('path')
const homeDir = require('os').homedir()
const _ = require('lodash')
const { spawn } = require('child_process')

const nsoFile = path.join(homeDir, '.wc.nso.json')

function readConfigFile () {
  return new Promise((resolve, reject) => {
    fs.readFile(nsoFile, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(JSON.parse(data))
      }
    })
  })
}

module.exports = (nso) => {
  return readConfigFile()
    .then((data) => {
      let order = _.get(data, nso, [])
      if (order.length === 0) {
        console.log('No ordering file found, run config-nso to set the network service order')
      } else {
        order.unshift('-ordernetworkservices')
        return new Promise((resolve, reject) => {
          const ls = spawn('networksetup', order)
          let out = ''
          let err = []
          ls.stdout.on('data', (data) => out = data.toString())
          ls.stderr.on('data', (data) => err.push(data.toString()))
          ls.on('close', (code) => {
            if (code === 0) {resolve(out)} else {reject(err)}
          })
        })
      }
    })
    .then(() => {
      console.log('Done!')
    })
    .catch((err) => {
      console.warn('Something happened,', err)
    })
}