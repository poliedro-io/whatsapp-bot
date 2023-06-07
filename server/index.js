const express = require("express");
const { Server } = require("ws");
const fs = require("fs");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static("data"));
const server = app.listen(PORT, () =>
  console.log(`Listening on http://localhost:${PORT}`)
);

const wss = new Server({ server });

wss.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("message", (message) => handleMessage(socket, message));
});

function handleMessage(socket, payload) {
  const payloadObject = JSON.parse(payload);
  console.log("message arrived:", payloadObject);
  if (payloadObject["close"]) {
    socket.close();
  }
  if (payloadObject["method"]) {
    const { method, params } = payloadObject;
    const task = new Task(method, params, socket);
    task.run();
  }
  if (payloadObject["cleanLogs"]) {
    cleanLogs();
  }
}

class Task {
  constructor(method, params, socket) {
    this.states = {
      PREPARING: 0,
      RUNNING: 1,
      COMPLETED: 2,
    };
    this.method = method;
    this.params = params;
    this.socket = socket;
    this.status = this.states.PREPARING;
    this.progress = 0;
  }

  run() {
    require(`./tasks/${this.method}`)
      .run(this.params, this)
      .then(
        (res) => {
          this.setStatus(this.states.COMPLETED);
          this.log(res);
        },
        (err) => console.log(err.message)
      );
  }

  setStatus(val) {
    this.status = val;
  }

  setProgress(val) {
    this.progress = val;
  }

  log(msg) {
    const payload = {
      status: this.status,
      progress: this.progress,
      message: msg,
    };
    console.log(payload);
    this.socket.send(JSON.stringify(payload));
  }
}

function cleanLogs() {
  fs.unlink("data/logs.json", (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
}
