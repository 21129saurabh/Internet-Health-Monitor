import { useEffect, useState } from "react";
import io from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import "./App.css";

// Custom icons
import greenIconImg from "./assets/green.png";
import redIconImg from "./assets/red.png";

// Fix leaflet marker issue
delete L.Icon.Default.prototype._getIconUrl;

const greenIcon = new L.Icon({
  iconUrl: greenIconImg,
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const redIcon = new L.Icon({
  iconUrl: redIconImg,
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

// Use environment variable for backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Socket.io connection
const socket = io(BACKEND_URL);

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    socket.on("network-update", (msg) => {
      const newData = {
        time: new Date().toLocaleTimeString(),
        latency: msg?.latency ?? 0,
        packet_loss: msg?.packet_loss ?? 0,
        latency_google: msg?.latency_google ?? 0,
        latency_cf: msg?.latency_cf ?? 0,
        outage: msg?.outage ?? false,
        location: (msg?.location?.lat && msg?.location?.lon)
          ? msg.location
          : { lat: 12.97, lon: 77.59, city: "Fallback (Bangalore)" }
      };

      setData((prev) => [...prev.slice(-20), newData]);
    });

    return () => socket.off("network-update");
  }, []);

  const latest = data[data.length - 1];

  // Helper to post metrics (if needed)
  const postMetrics = async (metrics) => {
    try {
      await fetch(`${BACKEND_URL}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      });
    } catch (err) {
      console.error("Error posting metrics:", err);
    }
  };

  return (
    <div className="app">

      {/* HEADER */}
      <h1 className="title">🌍 Network Intelligence Dashboard</h1>
      <p className="subtitle">Real-time decentralized monitoring</p>

      {/* CARDS */}
      {latest && (
        <div className="grid cards">
          <div className="card">
            <h3>Latency</h3>
            <h2>{latest.latency} ms</h2>
          </div>

          <div className="card">
            <h3>Packet Loss</h3>
            <h2>{latest.packet_loss} %</h2>
          </div>

          <div className={`card ${latest.outage ? "bad" : "good"}`}>
            <h3>Status</h3>
            <h2>{latest.outage ? "⚠️ Issue" : "✅ Healthy"}</h2>
          </div>
        </div>
      )}

      {/* GRAPH + MAP */}
      <div className="split">

        {/* GRAPH */}
        <div className="section">
          <h2>📊 Network Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#ef4444" strokeWidth={3} />
              <Line type="monotone" dataKey="packet_loss" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MAP */}
        <div className="section">
          <h2>🗺️ Network Map</h2>
          <MapContainer center={[12.97, 77.59]} zoom={5} className="map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {data.map((d, i) => {
              if (!d.location?.lat || !d.location?.lon) return null;

              return (
                <Marker
                  key={i}
                  position={[d.location.lat, d.location.lon]}
                  icon={d.outage ? redIcon : greenIcon}
                >
                  <Popup>
                    <b>{d.location.city}</b><br />
                    Latency: {d.latency} ms<br />
                    Loss: {d.packet_loss} %
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

      </div>

      {/* LOGS */}
      <div className="section">
        <h2>📜 Activity Logs</h2>
        <div className="logs">
          {data.map((d, i) => (
            <div key={i} className="log-item">
              {d.time} → {d.latency} ms | Loss: {d.packet_loss}%
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default App;