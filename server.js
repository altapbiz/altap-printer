
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.get("/", (_req, res) => {
  res.send("ALTAP PRINTER server is running");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

let connection;

app.post("/connect", async (req, res) => {
  const username = String(req.body.username || "")
    .replace(/^@/, "")
    .trim();

  if (!username) {
    return res.status(400).json({ error: "TikTok username is required" });
  }

  try {
    if (connection) {
      try { await connection.disconnect(); } catch {}
    }

    connection = new TikTokLiveConnection(username);
    await connection.connect();

    connection.on(WebcastEvent.GIFT, (data) => {
      io.emit("gift", {
        username: data.user?.uniqueId || "TikTok user",
        nickname: data.user?.nickname || "",
        avatar: data.user?.avatarThumb?.urlList?.[0] || "",
        giftName: data.giftDetails?.giftName || "Gift"
      });
    });

    res.json({ connected: true, username });
  } catch (error) {
    console.error("TikTok connection error:", error.message);
    res.status(502).json({
      connected: false,
      error: "LIVE connection failed. Check that the account is live and retry."
    });
  }
});

const port = process.env.PORT || 3000;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`ALTAP PRINTER server listening on ${port}`);
});
