const axios = require("axios");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

/**
 * API Route: /metrics
 */
app.post("/metrics", async (req, res) => {
  const data = req.body;

  // 🔥 Step 1: Get real IP (handle proxies)
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (ip && ip.includes(",")) {
    ip = ip.split(",")[0];
  }

  if (ip && ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  console.log("🌐 Detected IP:", ip);

  // 🔥 Step 2: Use client-provided location if exists (BEST)
  if (data.location && data.location.lat && data.location.lon) {
    console.log("📍 Using client location:", data.location);
  } else {
    // 🔥 Step 3: Fallback to IP-based geo lookup
    try {
      if (!ip || ip === "127.0.0.1" || ip === "::1") {
        ip = "8.8.8.8"; // fallback only if truly localhost
      }

      const geo = await axios.get(`http://ip-api.com/json/${ip}`);

      data.location = {
        lat: geo.data.lat,
        lon: geo.data.lon,
        city: geo.data.city
      };

      console.log("📍 Geo location:", data.location);

    } catch (err) {
      console.log("❌ Geo lookup failed");

      data.location = {
        lat: 12.97,
        lon: 77.59,
        city: "Fallback (Bangalore)"
      };
    }
  }

  // 🔥 Metrics processing
  data.latency =
    ((Number(data.latency_google) || 0) +
      (Number(data.latency_cf) || 0)) / 2;

  data.timestamp = Date.now();
  data.outage = data.latency > 200 || data.packet_loss > 20;

  console.log("📡 Incoming:", data);

  // 🔥 Send to frontend
  io.emit("network-update", data);

  res.json({ status: "ok" });
});

/**
 * Serve Vite frontend
 */
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// Catch-all for React routing
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

/**
 * Start server
 */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});