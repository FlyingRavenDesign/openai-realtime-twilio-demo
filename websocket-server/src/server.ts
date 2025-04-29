import express, { Request, Response } from "express";
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
app.use(express.urlencoded({ extended: false }));   // ← needed for Twilio’s form POST
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* ───── 🔐  ALLOW-LIST  ───────────────────────────────────────────── */
const ALLOWED_CALLERS =
  (process.env.ALLOWED_CALLERS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
/* ────────────────────────────────────────────────────────────────── */



const twimlPath = join(__dirname, "twiml.xml");
const twimlTemplate = readFileSync(twimlPath, "utf-8");


app.get("/public-url", (req, res) => {
  res.json({ publicUrl: PUBLIC_URL });
});

/* ───── 🛂  GATEKEEPER ROUTE  ────────────────────────────────────── */
app.all("/twiml", (req, res) => {
  const caller = (req.body?.From || req.query?.From || "") as string;

  if (!ALLOWED_CALLERS.includes(caller)) {
    return res
      .type("text/xml")
      .send('<Response><Reject reason="rejected"/></Response>');
  }

  const ws = new URL(process.env.PUBLIC_URL!);
  ws.protocol = "wss:";
  ws.pathname = "/call";

  const xml = twimlTemplate.replace("{{WS_URL}}", ws.toString());
  res.type("text/xml").send(xml);
});
/* ────────────────────────────────────────────────────────────────── */

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

export default app;
