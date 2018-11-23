/*
    SPDX-License-Identifier: Apache-2.0
*/

/**
 *
 * Created by shouhewu on 6/8/17.
 *
 */

var http = require("http")
var EventCenter = require('./EventCenter.js')


async function startListen () {
  server = http.createServer()
  var eventCenter = new EventCenter()
  await eventCenter.initialize()
  server.listen(8888, function () {
    console.log('\n')
    console.log('pid is ' + process.pid)
    console.log('\n')
  })
}

startListen()
