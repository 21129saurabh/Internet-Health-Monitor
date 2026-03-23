const axios = require("axios");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

app.post("/metrics", async (req, res) => {
  const data = req.body;

  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // Handle localhost
  if (ip === "::1" || ip === "127.0.0.1") {
    ip = "8.8.8.8";
  }

  try {
    const geo = await axios.get(`http://ip-api.com/json/${ip}`);

    data.location = {
      lat: geo.data.lat,
      lon: geo.data.lon,
      city: geo.data.city
    };
  } catch (err) {
    console.log("Geo lookup failed");
    data.location = {
      lat: 12.97,
      lon: 77.59,
      city: "Fallback (Bangalore)"
    };
  }

  data.latency =
    ((Number(data.latency_google) || 0) +
      (Number(data.latency_cf) || 0)) / 2;

  data.timestamp = Date.now();
  data.outage = data.latency > 200 || data.packet_loss > 20;

  console.log("📡 Incoming:", data); // DEBUG

  io.emit("network-update", data);

  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});