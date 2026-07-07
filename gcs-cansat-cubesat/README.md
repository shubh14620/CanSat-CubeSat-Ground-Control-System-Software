# 🛰️ CanSat & CubeSat Ground Control Software (GCS)

> A professional, aerospace-grade Ground Control Software built as a **pure browser web application** — inspired by mission control interfaces at NASA, ESA, ISRO and SpaceX.

![Version](https://img.shields.io/badge/version-2.0-00E5FF)
![License](https://img.shields.io/badge/license-MIT-00FF88)
![Status](https://img.shields.io/badge/status-production-success)
![Made With](https://img.shields.io/badge/made%20with-HTML%2FCSS%2FJS-FFD54F)

---

## 📖 Project Overview

**GCS** is a complete Ground Control Software suite designed for real-time telemetry, tracking, visualization, and command execution for two classes of small spacecraft:

- 🛸 **CanSat** — soft-drink-can-sized atmospheric probe (drop / descent missions)
- 🛰️ **CubeSat** — 1U/3U small satellite (orbital missions)

Everything runs entirely inside the browser — **no backend, no database, no build step.** Just open `index.html` and you have a full mission control dashboard.

---

## ✨ Features

### 📡 Real-Time Telemetry
- Full CanSat telemetry: altitude, pressure, temperature, humidity, battery, GPS, satellites, pitch/roll/yaw, descent rate, mission state, container & payload telemetry
- Full CubeSat telemetry: orbit altitude, orbital velocity, ground track, battery, solar output, power consumption, RSSI, comm status, reaction wheel, magnetometer, gyroscope, sun sensor, thermal sensors, mission phase
- Live packet counter, mission time, elapsed time

### 📈 Live Graphs (Chart.js)
- Altitude, Temperature, Pressure, Humidity, Battery
- Descent Rate, Power, Orbital Velocity (mission-dependent)
- 1-second update tick, 60-second sliding window

### 🗺️ Map & Trajectory (Leaflet.js + OpenStreetMap)
- **CanSat:** moving GPS marker with mission trail
- **CubeSat:** ground track, satellite position, orbit visualization, ground station marker
- Dark-mode aerospace tile filtering

### 🧭 3D Attitude Visualization (Three.js)
- Live-rotating 3D model (cylinder for CanSat, cube for CubeSat with solar panels)
- Pitch / Roll / Yaw applied in real time
- Classic aviation-style artificial horizon indicator

### 📹 Live Camera Feed (MediaDevices API)
- Start / stop browser webcam feed
- Fullscreen mode
- HUD overlay with crosshair and rec indicator

### 🔌 Web Serial API
- Connect to real hardware (Arduino/STM32) at 9600 baud
- CSV telemetry line parser
- Auto-switches simulation off when connected

### 🎛️ Mission Command Panel
- **CanSat:** Manual Separation, Emergency Parachute, Activate Payload, Reset Mission, Emergency Stop
- **CubeSat:** Safe Mode, Deploy Solar Panels, Enable Payload, Attitude Control, Communication Reset, Emergency Stop
- Animated execution feedback and command history log

### 🚨 Aerospace Error Code System
- 4-digit code display: `D1 D2 D3 D4`
  - Digit 1 = Descent Rate anomaly
  - Digit 2 = GPS anomaly
  - Digit 3 = Payload separation anomaly
  - Digit 4 = Emergency parachute anomaly
- Sample codes: `0000`, `1000`, `0100`, `0010`, `0001`, `1111`
- Animated red-alert blinking indicators

### 💾 Data Management
- CSV export (all telemetry fields, ISO timestamps)
- PNG export of every live chart
- 3600-packet rolling telemetry history
- Full mission log with severity levels

### 🎨 Design
- Dark aerospace theme with **glassmorphism** cards
- Toggleable light theme
- Smooth animations, hover states, toast notifications
- **Fully responsive:** desktop → laptop → tablet → mobile

### 📡 Simulation Mode
- Physics-inspired CanSat descent model (gravity, apogee, parachute)
- Orbital CubeSat model (Keplerian ground track, sunlight/eclipse cycle, thermal variation)
- Generates realistic 1 Hz telemetry when no hardware is connected

---

## 📸 Screenshots Section

_Place your screenshots inside `assets/images/`. Suggested captures:_

| File | Description |
|------|-------------|
| `screenshot-cansat.png`   | CanSat mission dashboard (default view) |
| `screenshot-cubesat.png`  | CubeSat mission dashboard |
| `screenshot-map.png`      | Leaflet map with GPS trail |
| `screenshot-3d.png`       | Three.js orientation cube |
| `screenshot-camera.png`   | Live camera feed active |
| `screenshot-mobile.png`   | Responsive mobile view |
| `screenshot-errorcode.png`| Error code system in alert state |

```markdown
![CanSat Dashboard](assets/images/screenshot-cansat.png)
![CubeSat Dashboard](assets/images/screenshot-cubesat.png)
```

---

## 🚀 Installation

### Option 1: Direct download
```bash
git clone https://github.com/your-username/gcs-cansat-cubesat.git
cd gcs-cansat-cubesat
```
Open `index.html` in a modern browser (Chrome/Edge recommended for Web Serial API).

### Option 2: Local static server (recommended for camera / serial)
```bash
# Python 3
python -m http.server 8080

# Or Node http-server
npx http-server -p 8080
```
Then browse to `http://localhost:8080`.

> ⚠️ **Camera API** and **Web Serial API** require a **secure context** (HTTPS or `localhost`). GitHub Pages and Vercel both provide HTTPS out of the box.

---

## 📁 Folder Structure

```
gcs-cansat-cubesat/
├── index.html            # Main dashboard shell
├── style.css             # Complete aerospace UI styling
├── script.js             # All application logic
├── README.md             # This file
├── LICENSE               # MIT License
├── .gitignore            # Git ignore rules
└── assets/
    ├── images/           # Screenshots, logos, textures
    ├── icons/            # Favicons, SVG icons
    └── fonts/            # Optional custom fonts (Orbitron/Rajdhani loaded via Google Fonts)
```

---

## 📚 Libraries Used

| Library | Purpose | CDN |
|--------|---------|-----|
| **Chart.js** 4.4.0 | Real-time line charts | jsDelivr |
| **Leaflet.js** 1.9.4 | Interactive mapping | unpkg |
| **OpenStreetMap** | Map tile provider | tile.openstreetmap.org |
| **Three.js** 0.160.0 | 3D orientation rendering | jsDelivr |
| **Google Fonts** | Orbitron, Rajdhani, JetBrains Mono | fonts.googleapis.com |
| **MediaDevices API** | Camera video stream | Native browser |
| **Web Serial API** | Hardware serial I/O | Native browser (Chromium) |
| **BroadcastChannel** | Multi-tab simulation sync | Native browser |

**No framework. No build tools. No package.json required.**

---

## 🌐 Deployment on GitHub (GitHub Pages)

1. Create a new public repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: GCS v2.0"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/gcs-cansat-cubesat.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Source → `main` branch → `/root` → Save**
3. Site will be live at `https://YOUR-USERNAME.github.io/gcs-cansat-cubesat/`

---

## ▲ Deployment on Vercel

### One-click Vercel deploy
1. Push the project to GitHub (see above).
2. Go to [vercel.com](https://vercel.com) and **Import Project**.
3. Select the repository.
4. **Framework Preset: Other** (no build command required).
5. **Output directory: `.`** (leave root).
6. Click **Deploy** — done in ~30 seconds.

### Or Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

Your Ground Control Software will be live at `https://gcs-cansat-cubesat.vercel.app/`.

---

## 🎓 Hardware Integration (Optional)

If you want to feed **real** CanSat telemetry:

1. Connect Arduino/STM32/ESP32 via USB
2. Program it to output CSV lines at **9600 baud**, one packet per second:
   ```
   packets,missionTime,altitude,pressure,temp,humidity,battery,lat,lon,sats,pitch,roll,yaw,descentRate,state,containerAlt,payloadAlt
   42,00:01:23,543.2,955.4,26.7,52.3,7.8,28.7041,77.1025,9,3.2,-1.8,145.5,4.5,DESCENT,543.2,543.2
   ```
3. Click **Connect Serial** in the Mission Control panel → select port.
4. Simulation auto-disables. Live data streams in.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🔮 Future Scope

- 🌐 **WebRTC peer telemetry** — stream telemetry from a chase vehicle to base station in real time.
- 🤖 **On-board AI classifier** — TensorFlow.js anomaly detection on downlink data.
- 🛠️ **Multi-CanSat swarm mode** — coordinate multiple probes on the same dashboard.
- 🗺️ **3D globe view** — CesiumJS integration for true orbital visualization.
- 📊 **PDF mission reports** — auto-generated with jsPDF including all charts.
- 🔐 **Signed / encrypted telemetry** — LoRa-style packet integrity checks.
- 🎙️ **Voice command** — Web Speech API-driven mission commanding.
- 📡 **Ham radio SDR integration** — RTL-SDR.js for actual RF downlink.

---

## 👨‍🚀 Credits

Designed and engineered as a professional aerospace-grade project.
Inspired by mission control software from **NASA JPL**, **ESA ESOC**, **ISRO ISTRAC**, and **SpaceX Hawthorne**.

**Ad Astra Per Aspera.** 🚀
