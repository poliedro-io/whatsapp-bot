const express = require('express')
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

console.log()

const server = express()
  .use(express.static('dist'))
  //   .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));



const wss = new Server({ server });

wss.on('connection', socket => {
  console.log('Client connected');
  socket.on('message', message => handleMessage(socket, message))
})

function handleMessage(socket, payload) {
  const payloadObject = JSON.parse(payload)
  console.log('message arrived:', payloadObject)
  if (payloadObject['close']) {
    socket.close()
  }
  if (payloadObject['method']) {
    const { method, params } = payloadObject
    const task = new Task(method, params, socket)
    task.run()
  }
}




class Task {
  states = {
    PREPARING: 0,
    RUNNING: 1,
    COMPLETED: 2
  };
  constructor(method, params, socket) {
    this.method = method;
    this.params = params;
    this.socket = socket
    this.status = this.states.PREPARING
    this.progress = 0;
  }
  run() {
    require(`./tasks/${this.method}`).run(this.params, this)
    .then(res => {
      this.setStatus(this.states.COMPLETED)
      this.log(res)
    },
    err=>console.log(err.message))
  }

  setStatus(val){
    this.status = val
  }

  setProgress(val){
    this.progress = val
  }

  log(msg) {
    const payload = {
      status: this.status,
      progress: this.progress,
      message: msg
    }
    console.log(msg)
    this.socket.send(JSON.stringify(payload))
  }
}