import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import http from "http";
import { readFileSync } from "fs";
import { join } from "path";
import cors from "cors";
import {
  handleCallConnection,
  handleFrontendConnection,
} from "./sessionManager";
import functions from "./functionHandlers";

dotenv.config();

const PORT = parseInt(process.env.PORT || "8081", 10);
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.urlencoded({ extended: false, limit: "1mb" }));

const twimlPath = join(__dirname, "twiml.xml");
const twimlTemplate = readFileSync(twimlPath, "utf-8");

// 2. caller allow-list
const ALLOWED_CALLERS =
  (process.env.ALLOWED_CALLERS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);


app.get("/public-url", (req, res) => {
  res.json({ publicUrl: PUBLIC_URL });
});

app.all("/twiml", (req, res, next) => {
  try {
    // gate-keeper
    if (!ALLOWED_CALLERS.includes(req.body.From || "")) {
      return res.type("text/xml").send("<Response><Reject/></Response>");
    }

    const ws = new URL(process.env.PUBLIC_URL!);
    ws.protocol = "wss:"; ws.pathname = "/call";

    return res
      .type("text/xml")
      .send(twimlTemplate.replace("{{WS_URL}}", ws.toString()));
  } catch (err) {
    console.error("TwiML error:", err);
    // send *tiny* safe fallback so Twilio never gets >64 KB
    return res.type("text/xml").send("<Response><Say>Oops</Say></Response>");
  }
});

// New endpoint to list available tools (schemas)
app.get("/tools", (req, res) => {
  res.json(functions.map((f) => f.schema));
});

let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 1) {
    ws.close();
    return;
  }

  const type = parts[0];

  if (type === "call") {
    if (currentCall) currentCall.close();
    currentCall = ws;
    handleCallConnection(currentCall, OPENAI_API_KEY);
  } else if (type === "logs") {
    if (currentLogs) currentLogs.close();
    currentLogs = ws;
    handleFrontendConnection(currentLogs);
  } else {
    ws.close();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
