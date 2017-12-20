#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const Promise = require('bluebird')
const _ = require('lodash')
const inquirer = require('inquirer')
const { spawn } = require('child_process')
const homeDir = require('os').homedir()

function getNetworkServiceOrder () {
  return new Promise((resolve, reject) => {
    const ls = spawn('networksetup', [ '-listnetworkserviceorder' ])

    let out = ''
    let err = []
    ls.stdout.on('data', (data) => out = data.toString())
    ls.stderr.on('data', (data) => err.push(data.toString()))
    ls.on('close', (code) => {
      if (code === 0) {resolve(out)} else {reject(err)}
    })
  })
    .then((data) => {
      let output = data.split('\n')
      const regex = /\(\d*\) (.+?)$/
      let interfaces = _.reduce(output, (results, item) => {
        let matches = item.match(regex)
        if (matches) {
          results.push(matches[ 1 ])
        }
        return results
      }, [])
      return Promise.resolve(interfaces)
    })
}

function getOrdering (priority) {
  function compare (a, b) {
    if (a.toLowerCase().indexOf(priority.toLowerCase()) > -1) {
      return -1
    }
    return 1
  }

  return getNetworkServiceOrder()
    .then((inets) => {
      let questions = _.map(inets, (inet, index) => {
        return {
          type: 'list',
          name: `inet-${index}`,
          message: 'Inet',
          choices: (answers) => {
            return _.difference(inets, _.values(answers)).sort(compare)
          }
        }
      })
      return inquirer.prompt(questions)
    })
    .then((answers) => {
      let count = _.values(answers).length
      let ordering = []
      _.times(count, (i) => {
        ordering.push(answers[ `inet-${i}` ])
      })
      return Promise.resolve(ordering)
    })
}

console.log(`
============
Ethernet
============
`)
getOrdering('Ethernet')
  .then((ethernetFirst) => {
    console.log(`
============
Wi-Fi
============
`)
    return getOrdering('Wi-Fi')
      .then((wifiFirst) => {
        let results = {
          ethernet: ethernetFirst,
          wifi: wifiFirst
        }
        const nsoFile = path.join(homeDir, '.wc.nso.json')
        fs.ensureFileSync(nsoFile)
        fs.writeFileSync(nsoFile, JSON.stringify(results))
        console.log(`Done! config file written to ${nsoFile}`)
      })
  })