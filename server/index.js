import express from "express";
import { WebSocketServer } from "ws";
import fs from "fs";
import { pathToFileURL } from "url";
import path from "path";

const PORT = process.env.PORT || 3000;

// Ensure data directory exists
if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync("data/logs.json")) fs.writeFileSync("data/logs.json", "{}", "utf-8");

const app = express();
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});
app.use(express.static("data"));

// Upload image endpoint
app.post("/upload-image", (req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const buffer = Buffer.concat(chunks);
    const ext = (req.headers["x-file-ext"] || "png").replace(".", "");
    const filePath = `data/imagen.${ext}`;
    fs.writeFileSync(filePath, buffer);
    res.json({ ok: true, path: filePath });
  });
  req.on("error", () => res.status(500).json({ ok: false }));
});

// Delete image endpoint
app.delete("/upload-image", (_req, res) => {
  const files = fs.readdirSync("data").filter((f) => f.startsWith("imagen."));
  files.forEach((f) => fs.unlinkSync(`data/${f}`));
  res.json({ ok: true });
});

// Get send history
app.get("/logs", (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync("data/logs.json", "utf-8"));
    res.json(data);
  } catch {
    res.json({});
  }
});
const server = app.listen(PORT, () =>
  console.log(`Listening on http://localhost:${PORT}`)
);

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("message", (message) => handleMessage(socket, message));
});

async function handleMessage(socket, payload) {
  const payloadObject = JSON.parse(payload);
  console.log("message arrived:", payloadObject);
  if (payloadObject["close"]) {
    socket.close();
  }
  if (payloadObject["method"]) {
    const { method, params } = payloadObject;
    const task = new Task(method, params, socket);
    await task.run();
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

  async run() {
    try {
      const modulePath = pathToFileURL(
        path.resolve(`server/tasks/${this.method}.js`)
      ).href;
      const taskModule = await import(modulePath);
      const res = await taskModule.run(this.params, this);
      this.setStatus(this.states.COMPLETED);
      this.log(res);
    } catch (err) {
      console.log(err.message);
    }
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
  fs.writeFileSync("data/logs.json", JSON.stringify({}), "utf-8");
}
