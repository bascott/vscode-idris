let vscode    = require('vscode')
let cp        = require('child_process')
let formatter = require('./wire/formatter')
let parser    = require('./wire/parser')

let getCommands = () => {
  return [
    ['idris.typecheck', typecheckFile]
  ]
}

var buffer = ''
var requestId = 0
var warnings = {}

let getUID = () => {
  return ++requestId
}

let handleCommand = (cmd) => {
  if (cmd.length > 0) {
    let op = cmd[0]
    let params = cmd.slice(1, cmd.length - 1)
    let id = cmd[cmd.length - 1]
    switch (op) {
      case ':return':
        let ret = params[0]
        if (ret[0] === ':ok') {
          let okparams = ret[1]
        } else {
          let message = ret[1]
          console.log("message => " + message)
          let warning = warnings[id]
          for (i = 0, len = warning.length; i < len; i++) {
            let w = warning[i];
            console.log("line => " + w[1][0]);
            console.log("character => " + w[1][1]);
            console.log("message => " + w[3]);
          }
        }
        break
      case ':write-string':
        let msg = params[0]
        break
      case ':warning':
        warning = params[0]
        warnings[id].push(warning)
        break
      case ':set-prompt':
        break
    }
  }
}

let stdout = (data) => {
  buffer += data
  while (buffer.length > 6) {
    buffer = buffer.trimLeft().replace(/\r\n/g, "\n")
    let len = parseInt(buffer.substr(0, 6), 16)
    if (buffer.length >= 6 + len) {
      let cmd = buffer.substr(6, len).trim()
      buffer = buffer.substr(6 + len)
      let obj = parser.parse(cmd.trim())
			handleCommand(obj)
    } else {
      break
    }
  }
}

let typecheckFile = () => {
	let uri = vscode.window.activeTextEditor.document.uri.path
	let cwd = vscode.workspace.rootPath + "/src"

	let uid = getUID()
  warnings[uid] = []
	let cmd = [[':load-file', uri], 1]

	new Promise(function (resolve, reject) {
  	let options = vscode.workspace.rootPath ? { cwd : vscode.workspace.rootPath + "/src" } : {}
  	let childProcess = cp.spawn('idris', ['--ide-mode'], options)

  	childProcess.on('error', (error) => {
    	vscode.window.showErrorMessage('Cannot find Idris.')
			resolve()
  	})

  	if (childProcess.pid) {
    	childProcess.stdout.setEncoding('utf8').on('data', (data) => {
        stdout(data)
				resolve()
    	})
    }

		childProcess.stdin.write(formatter.serialize(cmd))
  }).then(function () {
    vscode.window.showInformationMessage("Idris: File loaded successfully")
	}).catch(function () {
    vscode.window.showErrorMessage("Idris Errors")
	})
}

module.exports = {
  getCommands
}
