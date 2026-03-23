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

const socket = io("http://localhost:3000");

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    socket.on("network-update", (msg) => {
      const newData = {
        time: new Date().toLocaleTimeString(),
        latency: msg.latency,
        packet_loss: msg.packet_loss,
        latency_google: msg.latency_google,
        latency_cf: msg.latency_cf,
        outage: msg.outage,
        location: msg.location
      };

      setData((prev) => [...prev.slice(-20), newData]);
    });

    return () => socket.off("network-update");
  }, []);

  const latest = data[data.length - 1];

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
              <Line type="monotone" dataKey="latency" stroke="#ef4444" strokeWidth={3}/>
              <Line type="monotone" dataKey="packet_loss" stroke="#3b82f6" strokeWidth={3}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MAP */}
        <div className="section">
          <h2>🗺️ Network Map</h2>
          <MapContainer center={[12.97, 77.59]} zoom={5} className="map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {data.map((d, i) => {
              if (!d.location) return null;

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