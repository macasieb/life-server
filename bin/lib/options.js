const fs = require('fs')
const path = require('path')
const validUrl = require('valid-url')
// const { URL } = require('url')

module.exports = [
  {
    name: 'root',
    message: 'Path to the folder you want to serve. (Default: ./data)',
    default: './data',
    filter: (value) => path.resolve(value)
  },
  {
    name: 'port',
    message: 'SSL port to run on. (Default: 8443)',
    default: '8443'
  },
  {
    name: 'serverUri',
    message: 'Server uri (with protocol, hostname and port)',
    default: 'https://localhost:8443',
    validate: validUri
  },
  {
    name: 'webid',
    message: 'Enable WebID authentication and access control (uses HTTPS)',
    default: true
  },
  {
    name: 'mount',
    message: "Serve on a specific URL path (default: '/')",
    default: '/'
  },
  {
    name: 'config',
    message: "Path to the config file (default: './config.dev.js')",
    default: './config.dev.js'
  },
  {
    name: 'db-path',
    message: 'Path to the server metadata db directory (for users/apps etc)',
    default: './.db'
  },
  {
    name: 'ssl-key',
    message: 'Path to the SSL private key in PEM format',
    default: '../privkey.pem',
    validate: validPath
  },
  {
    name: 'ssl-cert',
    message: 'Path to the SSL certificate key in PEM format',
    default: '../fullchain.pem',
    validate: validPath
  },
  {
    name: 'multiuser',
    message: 'Enable multi-user mode',
    default: false
  }
  // {
  //   name: 'secret',
  //   message: 'Secret used to sign the session ID cookie (e.g. "your secret phrase")',
  //   default: 'random',
  //   filter: function (value) {
  //     if (value === '' || value === 'random') {
  //       return
  //     }
  //     return value
  //   }
  // },
  // {
  //   name: 'force-user',
  //   message: 'Force a WebID to always be logged in (useful when offline)'
  // },
]

function validPath (value) {
  if (value === 'default') {
    return Promise.resolve(true)
  }
  if (!value) {
    return Promise.resolve('You must enter a valid path')
  }
  return new Promise((resolve) => {
    fs.stat(value, function (err) {
      if (err) return resolve('Nothing found at this path')
      return resolve(true)
    })
  })
}

function validUri (value) {
  if (!validUrl.isUri(value)) {
    return 'Enter a valid uri (with protocol)'
  }
  return true
}
