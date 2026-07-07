/* =========================================================
 * CanSat & CubeSat Ground Control Software (GCS)
 * Aerospace-grade telemetry and mission control
 * =========================================================
 * Modules:
 *  - State manager
 *  - Simulator (CanSat & CubeSat physics-inspired)
 *  - Telemetry renderer
 *  - Chart.js live charts
 *  - Leaflet.js map (GPS trail / ground track / orbit)
 *  - Three.js 3D orientation cube
 *  - Camera (MediaDevices API)
 *  - Web Serial API for real hardware
 *  - CSV / graph export
 *  - Error code system
 *  - Mission command executor
 * ========================================================= */

'use strict';

/* ============ GLOBAL STATE ============ */
const STATE = {
    mission: 'cansat',         // 'cansat' | 'cubesat'
    telemetryRunning: false,
    simulation: true,
    theme: 'dark',
    packets: 0,
    missionStartTime: null,
    lastPacketTime: null,
    logs: [],
    telemetryHistory: [],
    cameraStream: null,
    cameraStartTime: null,
    serialPort: null,
    serialReader: null,
    map: null,
    marker: null,
    trail: null,
    orbitPath: null,
    threeScene: null,
    threeCamera: null,
    threeRenderer: null,
    threeCube: null,
    charts: {},
    currentData: null,
    errorCode: '0000',
    mainInterval: null,
    // CanSat physics state
    cansat: {
        altitude: 700,
        maxAltitude: 700,
        vertVel: 0,
        pressure: 940,
        temperature: 28,
        humidity: 45,
        battery: 8.4,
        pitch: 0, roll: 0, yaw: 0,
        lat: 28.7041, lon: 77.1025,   // Base coords (New Delhi)
        satellites: 8,
        descentRate: 0,
        state: 'PRE-LAUNCH',
        parachuteDeployed: false,
        payloadSeparated: false,
        payloadActivated: false,
        containerAlt: 700,
        payloadAlt: 700,
        launched: false,
        t: 0
    },
    // CubeSat orbital state
    cubesat: {
        orbitAlt: 500,
        orbitalVel: 7.61,      // km/s
        lat: 0, lon: 0,
        battery: 7.4,
        solarOutput: 25.4,
        powerConsumption: 12.8,
        rssi: -75,
        comm: 'NOMINAL',
        pitch: 0, roll: 0, yaw: 0,
        payloadStatus: 'STANDBY',
        reactionWheel: 'NOMINAL',
        magX: 0, magY: 0, magZ: 0,
        gyroX: 0, gyroY: 0, gyroZ: 0,
        sunAngle: 45,
        thermalPayload: 22,
        thermalBattery: 18,
        thermalCPU: 35,
        phase: 'CRUISE',
        theta: 0,
        safeMode: false,
        solarDeployed: false,
        t: 0
    }
};

/* ============ CONFIG ============ */
const CANSAT_FIELDS = [
    { key: 'packets',      label: 'Packet Count',      unit: '',    fmt: v => v },
    { key: 'missionTime',  label: 'Mission Time',      unit: '',    fmt: v => v },
    { key: 'altitude',     label: 'Altitude',          unit: 'm',   fmt: v => v.toFixed(1) },
    { key: 'pressure',     label: 'Pressure',          unit: 'hPa', fmt: v => v.toFixed(2) },
    { key: 'temperature',  label: 'Temperature',       unit: '°C',  fmt: v => v.toFixed(1) },
    { key: 'humidity',     label: 'Humidity',          unit: '%',   fmt: v => v.toFixed(1) },
    { key: 'battery',      label: 'Battery Voltage',   unit: 'V',   fmt: v => v.toFixed(2) },
    { key: 'lat',          label: 'Latitude',          unit: '°',   fmt: v => v.toFixed(5) },
    { key: 'lon',          label: 'Longitude',         unit: '°',   fmt: v => v.toFixed(5) },
    { key: 'satellites',   label: 'Satellites',        unit: '',    fmt: v => v },
    { key: 'pitch',        label: 'Pitch',             unit: '°',   fmt: v => v.toFixed(1) },
    { key: 'roll',         label: 'Roll',              unit: '°',   fmt: v => v.toFixed(1) },
    { key: 'yaw',          label: 'Yaw',               unit: '°',   fmt: v => v.toFixed(1) },
    { key: 'descentRate',  label: 'Descent Rate',      unit: 'm/s', fmt: v => v.toFixed(2) },
    { key: 'state',        label: 'Mission State',     unit: '',    fmt: v => v, wide: true },
    { key: 'containerAlt', label: 'Container Alt.',    unit: 'm',   fmt: v => v.toFixed(1) },
    { key: 'payloadAlt',   label: 'Payload Alt.',      unit: 'm',   fmt: v => v.toFixed(1) }
];

const CUBESAT_FIELDS = [
    { key: 'packets',         label: 'Packet Count',    unit: '',      fmt: v => v },
    { key: 'missionTime',     label: 'Mission Time',    unit: '',      fmt: v => v },
    { key: 'orbitAlt',        label: 'Orbit Altitude',  unit: 'km',    fmt: v => v.toFixed(1) },
    { key: 'orbitalVel',      label: 'Orbital Velocity',unit: 'km/s',  fmt: v => v.toFixed(3) },
    { key: 'lat',             label: 'Latitude',        unit: '°',     fmt: v => v.toFixed(3) },
    { key: 'lon',             label: 'Longitude',       unit: '°',     fmt: v => v.toFixed(3) },
    { key: 'battery',         label: 'Battery',         unit: 'V',     fmt: v => v.toFixed(2) },
    { key: 'solarOutput',     label: 'Solar Output',    unit: 'W',     fmt: v => v.toFixed(1) },
    { key: 'powerConsumption',label: 'Power Cons.',     unit: 'W',     fmt: v => v.toFixed(1) },
    { key: 'comm',            label: 'Comm Status',     unit: '',      fmt: v => v },
    { key: 'rssi',            label: 'RSSI',            unit: 'dBm',   fmt: v => v.toFixed(0) },
    { key: 'payloadStatus',   label: 'Payload',         unit: '',      fmt: v => v },
    { key: 'reactionWheel',   label: 'Reaction Wheel',  unit: '',      fmt: v => v },
    { key: 'magX',            label: 'Mag X',           unit: 'µT',    fmt: v => v.toFixed(2) },
    { key: 'magY',            label: 'Mag Y',           unit: 'µT',    fmt: v => v.toFixed(2) },
    { key: 'magZ',            label: 'Mag Z',           unit: 'µT',    fmt: v => v.toFixed(2) },
    { key: 'gyroX',           label: 'Gyro X',          unit: '°/s',   fmt: v => v.toFixed(2) },
    { key: 'gyroY',           label: 'Gyro Y',          unit: '°/s',   fmt: v => v.toFixed(2) },
    { key: 'gyroZ',           label: 'Gyro Z',          unit: '°/s',   fmt: v => v.toFixed(2) },
    { key: 'sunAngle',        label: 'Sun Sensor',      unit: '°',     fmt: v => v.toFixed(1) },
    { key: 'thermalPayload',  label: 'Therm PL',        unit: '°C',    fmt: v => v.toFixed(1) },
    { key: 'thermalBattery',  label: 'Therm BAT',       unit: '°C',    fmt: v => v.toFixed(1) },
    { key: 'thermalCPU',      label: 'Therm CPU',       unit: '°C',    fmt: v => v.toFixed(1) },
    { key: 'pitch',           label: 'Pitch',           unit: '°',     fmt: v => v.toFixed(1) },
    { key: 'roll',            label: 'Roll',            unit: '°',     fmt: v => v.toFixed(1) },
    { key: 'yaw',             label: 'Yaw',             unit: '°',     fmt: v => v.toFixed(1) },
    { key: 'phase',           label: 'Mission Phase',   unit: '',      fmt: v => v, wide: true }
];

/* ============ UTILITIES ============ */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function pad(n, len = 2) { return String(n).padStart(len, '0'); }
function fmtTime(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function noise(scale = 1) { return (Math.random() - 0.5) * scale; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* ============ LOGGING ============ */
function log(msg, type = 'info') {
    const time = new Date().toTimeString().slice(0, 8);
    const entry = { time, msg, type, timestamp: Date.now() };
    STATE.logs.push(entry);
    if (STATE.logs.length > 200) STATE.logs.shift();
    const container = $('#logContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `log-entry ${type}`;
    el.innerHTML = `<span class="log-time">[${time}]</span>${msg}`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    while (container.children.length > 200) container.removeChild(container.firstChild);
}

function toast(title, body = '', type = 'info', duration = 3200) {
    const container = $('#toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="toast-title">${title}</div><div>${body}</div>`;
    container.appendChild(el);
    setTimeout(() => {
        el.classList.add('fadeout');
        setTimeout(() => el.remove(), 300);
    }, duration);
}

/* ============ BOOT SEQUENCE ============ */
const bootSteps = [
    'Loading modules...',
    'Initializing telemetry engine...',
    'Connecting to Chart.js renderer...',
    'Mounting Leaflet map layers...',
    'Booting Three.js WebGL context...',
    'Preparing simulation engine...',
    'GCS ready.'
];
function runBoot() {
    let i = 0;
    const bootEl = $('#bootStatus');
    const iv = setInterval(() => {
        if (bootEl) bootEl.textContent = bootSteps[i];
        i++;
        if (i >= bootSteps.length) {
            clearInterval(iv);
            setTimeout(() => {
                $('#bootSplash').classList.add('hide');
                setTimeout(() => { $('#bootSplash').style.display = 'none'; }, 600);
                log('GCS initialized. Ready for mission operations.', 'success');
                toast('SYSTEM ONLINE', 'Ground Control Software v2.0 ready.', 'success');
            }, 400);
        }
    }, 350);
}

/* ============ CLOCKS ============ */
function updateClocks() {
    const now = new Date();
    $('#missionTime').textContent = now.toTimeString().slice(0, 8);
    $('#currentDate').textContent = now.toISOString().slice(0, 10);
    if (STATE.missionStartTime && STATE.telemetryRunning) {
        const elapsed = Math.floor((Date.now() - STATE.missionStartTime) / 1000);
        $('#elapsedTime').textContent = fmtTime(elapsed);
    }
    if (STATE.cameraStartTime) {
        const el = Math.floor((Date.now() - STATE.cameraStartTime) / 1000);
        $('#cameraTime').textContent = fmtTime(el);
    }
}

/* ============ TELEMETRY GRID ============ */
function buildTelemetryGrid() {
    const grid = $('#telemetryGrid');
    grid.innerHTML = '';
    const fields = STATE.mission === 'cansat' ? CANSAT_FIELDS : CUBESAT_FIELDS;
    fields.forEach(f => {
        const card = document.createElement('div');
        card.className = 'telemetry-card' + (f.wide ? ' full-width' : '');
        card.id = `tc-${f.key}`;
        card.innerHTML = `
            <div class="tc-label">${f.label}</div>
            <div class="tc-value" id="tv-${f.key}">--<span class="tc-unit">${f.unit}</span></div>
        `;
        grid.appendChild(card);
    });
    $('#telemetryTitle').textContent = STATE.mission === 'cansat' ? 'CANSAT TELEMETRY' : 'CUBESAT TELEMETRY';
    $('#mapTitle').textContent = STATE.mission === 'cansat' ? 'GPS TRACKING' : 'ORBITAL GROUND TRACK';
}

function renderTelemetry(data) {
    const fields = STATE.mission === 'cansat' ? CANSAT_FIELDS : CUBESAT_FIELDS;
    fields.forEach(f => {
        const el = $(`#tv-${f.key}`);
        if (!el) return;
        const val = data[f.key];
        if (val === undefined || val === null) return;
        const formatted = f.fmt(val);
        el.innerHTML = `${formatted}<span class="tc-unit">${f.unit}</span>`;
        el.classList.remove('updated');
        void el.offsetWidth;
        el.classList.add('updated');

        // Color coding
        const card = $(`#tc-${f.key}`);
        card.classList.remove('warning', 'danger', 'success');
        if (f.key === 'battery') {
            if (val < 6.5) card.classList.add('danger');
            else if (val < 7.2) card.classList.add('warning');
            else card.classList.add('success');
        }
        if (f.key === 'temperature' && (val > 55 || val < -10)) card.classList.add('warning');
        if (f.key === 'descentRate' && val > 15) card.classList.add('danger');
        if (f.key === 'rssi' && val < -95) card.classList.add('warning');
    });
    $('#packetBadge').textContent = `PKT ${data.packets}`;
    $('#footerPackets').textContent = data.packets;
    $('#coordBadge').textContent = `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`;
    $('#attitudeBadge').textContent = `P:${data.pitch.toFixed(0)}° R:${data.roll.toFixed(0)}° Y:${data.yaw.toFixed(0)}°`;
    $('#ahPitch').textContent = `${data.pitch.toFixed(1)}°`;
    $('#ahRoll').textContent = `${data.roll.toFixed(1)}°`;
    $('#ahYaw').textContent = `${data.yaw.toFixed(1)}°`;
}

/* ============ SIMULATION ENGINE ============ */
function simulateCanSat() {
    const c = STATE.cansat;
    c.t += 1;

    // Launch phase logic
    if (!c.launched && c.t > 3) {
        c.launched = true;
        c.state = 'ASCENT';
        c.vertVel = 45;
        log('Launch detected. Ascent phase begins.', 'success');
    }

    if (c.state === 'ASCENT') {
        c.vertVel -= 9.8 * 1; // gravity
        c.altitude += c.vertVel;
        if (c.vertVel <= 0) {
            c.state = 'APOGEE';
            c.maxAltitude = c.altitude;
            log(`APOGEE reached at ${c.altitude.toFixed(1)}m`, 'success');
        }
    } else if (c.state === 'APOGEE') {
        c.state = 'DESCENT';
    } else if (c.state === 'DESCENT') {
        // Free-fall descent
        c.vertVel = Math.min(c.vertVel - 2, 25);
        c.altitude += c.vertVel;
        c.descentRate = -c.vertVel;

        // Auto-deploy separation at 500m
        if (c.altitude <= 500 && !c.payloadSeparated) {
            c.payloadSeparated = true;
            c.state = 'SEPARATED';
            log('Payload separation at 500m', 'success');
            toast('SEPARATION', 'Container-payload separation confirmed', 'success');
        }
    } else if (c.state === 'SEPARATED') {
        c.vertVel = -12;
        c.altitude += c.vertVel;
        c.containerAlt = c.altitude + noise(2);
        c.payloadAlt = c.altitude + noise(3);
        c.descentRate = 12;

        if (c.altitude <= 200 && !c.parachuteDeployed) {
            c.parachuteDeployed = true;
            c.state = 'CHUTE_DEPLOYED';
            log('Parachute deployed at 200m', 'success');
            toast('PARACHUTE', 'Emergency parachute deployed', 'success');
        }
    } else if (c.state === 'CHUTE_DEPLOYED') {
        c.vertVel = -5;
        c.altitude += c.vertVel;
        c.descentRate = 5;
        c.containerAlt = c.altitude + noise(1);
        c.payloadAlt = c.altitude + noise(2);
        if (c.altitude <= 5) {
            c.altitude = 0;
            c.state = 'LANDED';
            log('Touchdown! Mission successful.', 'success');
            toast('LANDED', 'CanSat has touched down', 'success');
        }
    }

    c.altitude = Math.max(0, c.altitude);
    if (c.altitude < 0.1) c.vertVel = 0;

    // Environmental physics (ISA-ish approximation)
    c.pressure = 1013.25 * Math.pow(1 - 0.0065 * c.altitude / 288.15, 5.255) + noise(0.5);
    c.temperature = 28 - 0.0065 * c.altitude + noise(0.8);
    c.humidity = clamp(45 + noise(3) - c.altitude * 0.005, 20, 85);
    c.battery = clamp(c.battery - 0.002 + noise(0.005), 6.0, 8.4);

    // Attitude - more rotation during descent
    const spin = c.state === 'DESCENT' || c.state === 'SEPARATED' ? 15 : 3;
    c.pitch = clamp(c.pitch + noise(spin), -60, 60);
    c.roll = clamp(c.roll + noise(spin), -60, 60);
    c.yaw = (c.yaw + 2 + noise(5) + 360) % 360;

    // GPS drift
    c.lat += noise(0.00008);
    c.lon += noise(0.00008);
    c.satellites = Math.round(clamp(8 + noise(2), 4, 12));

    return {
        packets: STATE.packets,
        missionTime: fmtTime(Math.floor((Date.now() - STATE.missionStartTime) / 1000)),
        altitude: c.altitude,
        pressure: c.pressure,
        temperature: c.temperature,
        humidity: c.humidity,
        battery: c.battery,
        lat: c.lat,
        lon: c.lon,
        satellites: c.satellites,
        pitch: c.pitch,
        roll: c.roll,
        yaw: c.yaw,
        descentRate: c.descentRate,
        state: c.state,
        containerAlt: c.containerAlt || c.altitude,
        payloadAlt: c.payloadAlt || c.altitude
    };
}

function simulateCubeSat() {
    const c = STATE.cubesat;
    c.t += 1;
    c.theta += 0.5;   // deg per sec (5760 sec ~ 96 min orbit)

    // Orbital altitude oscillation (elliptical hint)
    c.orbitAlt = 500 + Math.sin(c.theta * Math.PI / 180) * 15 + noise(0.5);
    c.orbitalVel = 7.61 - (c.orbitAlt - 500) * 0.001 + noise(0.005);

    // Ground track (simplified)
    c.lat = 51.6 * Math.sin(c.theta * Math.PI / 180);
    c.lon = ((c.theta * 0.98) % 360) - 180;

    // Solar / Battery cycle (sunlight vs eclipse)
    const inSunlight = Math.sin(c.theta * Math.PI / 180 + 0.5) > -0.3;
    c.solarOutput = inSunlight ? (25 + noise(2)) : (noise(0.5));
    c.powerConsumption = 12 + (c.payloadStatus === 'ACTIVE' ? 6 : 0) + noise(0.5);
    const netPower = c.solarOutput - c.powerConsumption;
    c.battery = clamp(c.battery + netPower * 0.0005 + noise(0.002), 6.5, 8.4);

    // Communication windows - RSSI based on lat/lon proximity to ground station (0,0)
    const dist = Math.hypot(c.lat, c.lon);
    c.rssi = clamp(-60 - dist * 0.4 + noise(3), -110, -55);
    c.comm = c.rssi > -85 ? 'NOMINAL' : c.rssi > -100 ? 'DEGRADED' : 'NO SIGNAL';

    // Attitude control - reaction wheels keep it stable
    if (!c.safeMode) {
        c.pitch = clamp(c.pitch * 0.9 + noise(1.5), -15, 15);
        c.roll = clamp(c.roll * 0.9 + noise(1.5), -15, 15);
        c.yaw = (c.yaw + 0.5 + noise(0.5) + 360) % 360;
    } else {
        c.pitch += noise(3);
        c.roll += noise(3);
        c.yaw = (c.yaw + noise(5) + 360) % 360;
    }

    // Magnetometer
    c.magX = 25 * Math.sin(c.theta * Math.PI / 180) + noise(1);
    c.magY = 25 * Math.cos(c.theta * Math.PI / 180) + noise(1);
    c.magZ = 15 * Math.sin(c.theta * Math.PI / 90) + noise(1);

    // Gyroscopes
    c.gyroX = noise(2);
    c.gyroY = noise(2);
    c.gyroZ = 0.5 + noise(0.3);

    // Sun sensor
    c.sunAngle = inSunlight ? (30 + Math.sin(c.theta * Math.PI / 180) * 20 + noise(1)) : 0;

    // Thermal
    c.thermalPayload = 22 + (inSunlight ? 5 : -8) + noise(1);
    c.thermalBattery = 18 + (inSunlight ? 3 : -5) + noise(0.5);
    c.thermalCPU = 35 + (c.payloadStatus === 'ACTIVE' ? 8 : 0) + noise(1);

    // Mission phase
    if (c.t < 30) c.phase = 'DEPLOYMENT';
    else if (c.t < 60) c.phase = 'COMMISSIONING';
    else if (c.safeMode) c.phase = 'SAFE MODE';
    else c.phase = 'NOMINAL OPERATIONS';

    return {
        packets: STATE.packets,
        missionTime: fmtTime(Math.floor((Date.now() - STATE.missionStartTime) / 1000)),
        orbitAlt: c.orbitAlt,
        orbitalVel: c.orbitalVel,
        lat: c.lat,
        lon: c.lon,
        battery: c.battery,
        solarOutput: c.solarOutput,
        powerConsumption: c.powerConsumption,
        comm: c.comm,
        rssi: c.rssi,
        payloadStatus: c.payloadStatus,
        reactionWheel: c.reactionWheel,
        magX: c.magX, magY: c.magY, magZ: c.magZ,
        gyroX: c.gyroX, gyroY: c.gyroY, gyroZ: c.gyroZ,
        sunAngle: c.sunAngle,
        thermalPayload: c.thermalPayload,
        thermalBattery: c.thermalBattery,
        thermalCPU: c.thermalCPU,
        pitch: c.pitch, roll: c.roll, yaw: c.yaw,
        phase: c.phase
    };
}

/* ============ CHARTS (Chart.js) ============ */
const CHART_CONFIG_CANSAT = [
    { id: 'chartAltitude',    key: 'altitude',    label: 'Altitude (m)',     color: '#00E5FF' },
    { id: 'chartTemperature', key: 'temperature', label: 'Temperature (°C)', color: '#FFD54F' },
    { id: 'chartPressure',    key: 'pressure',    label: 'Pressure (hPa)',   color: '#A855F7' },
    { id: 'chartBattery',     key: 'battery',     label: 'Battery (V)',      color: '#00FF88' }
];
const CHART_CONFIG_CUBESAT = [
    { id: 'chartAltitude',    key: 'orbitAlt',       label: 'Orbit Altitude (km)', color: '#00E5FF' },
    { id: 'chartTemperature', key: 'thermalCPU',     label: 'CPU Temp (°C)',       color: '#FFD54F' },
    { id: 'chartPressure',    key: 'orbitalVel',     label: 'Orbital Velocity',    color: '#A855F7' },
    { id: 'chartBattery',     key: 'battery',        label: 'Battery (V)',         color: '#00FF88' }
];

function initCharts() {
    // Destroy existing
    Object.values(STATE.charts).forEach(c => c.destroy());
    STATE.charts = {};

    const configs = STATE.mission === 'cansat' ? CHART_CONFIG_CANSAT : CHART_CONFIG_CUBESAT;
    configs.forEach(cfg => {
        const ctx = $(`#${cfg.id}`);
        if (!ctx) return;
        STATE.charts[cfg.key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: cfg.label,
                    data: [],
                    borderColor: cfg.color,
                    backgroundColor: cfg.color + '22',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 250 },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'start',
                        labels: {
                            color: '#94A3B8',
                            font: { size: 10, family: 'Rajdhani', weight: '600' },
                            boxWidth: 10,
                            padding: 6
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17,24,39,0.95)',
                        borderColor: cfg.color,
                        borderWidth: 1,
                        titleColor: cfg.color,
                        bodyColor: '#E5E7EB',
                        titleFont: { family: 'Orbitron', size: 10 },
                        bodyFont: { family: 'JetBrains Mono', size: 10 }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: { color: '#64748B', font: { size: 8, family: 'JetBrains Mono' }, maxTicksLimit: 6 },
                        grid: { color: 'rgba(0, 229, 255, 0.05)' }
                    },
                    y: {
                        display: true,
                        ticks: { color: '#94A3B8', font: { size: 9, family: 'JetBrains Mono' } },
                        grid: { color: 'rgba(0, 229, 255, 0.08)' }
                    }
                }
            }
        });
    });
}

function updateCharts(data) {
    const configs = STATE.mission === 'cansat' ? CHART_CONFIG_CANSAT : CHART_CONFIG_CUBESAT;
    const t = data.missionTime;
    configs.forEach(cfg => {
        const chart = STATE.charts[cfg.key];
        if (!chart) return;
        chart.data.labels.push(t);
        chart.data.datasets[0].data.push(data[cfg.key]);
        if (chart.data.labels.length > 60) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update('none');
    });
}

/* ============ MAP (Leaflet) ============ */
function initMap() {
    if (STATE.map) { STATE.map.remove(); STATE.map = null; }
    const center = STATE.mission === 'cansat'
        ? [STATE.cansat.lat, STATE.cansat.lon]
        : [0, 0];
    const zoom = STATE.mission === 'cansat' ? 15 : 2;

    STATE.map = L.map('map', {
        center, zoom,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(STATE.map);

    // Dark filter
    const tilePane = STATE.map.getPane('tilePane');
    if (tilePane) tilePane.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)';

    const iconHtml = STATE.mission === 'cansat'
        ? '<div style="background:#00E5FF;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #00E5FF;"></div>'
        : '<div style="background:#00FF88;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 16px #00FF88;"></div>';

    const icon = L.divIcon({ html: iconHtml, iconSize: [20, 20], className: 'gcs-marker' });
    STATE.marker = L.marker(center, { icon }).addTo(STATE.map);
    STATE.trail = L.polyline([], {
        color: STATE.mission === 'cansat' ? '#00E5FF' : '#00FF88',
        weight: 2.5,
        opacity: 0.8,
        dashArray: STATE.mission === 'cubesat' ? '5,5' : null
    }).addTo(STATE.map);

    // Ground station for CubeSat
    if (STATE.mission === 'cubesat') {
        L.marker([28.7041, 77.1025], {
            icon: L.divIcon({
                html: '<div style="background:#FF5252;width:14px;height:14px;border-radius:2px;border:2px solid white;box-shadow:0 0 8px #FF5252;"></div>',
                iconSize: [14, 14],
                className: 'gs-marker'
            })
        }).bindTooltip('GROUND STATION', { permanent: false }).addTo(STATE.map);
    }
}

function updateMap(data) {
    if (!STATE.map || !STATE.marker) return;
    const pos = [data.lat, data.lon];
    STATE.marker.setLatLng(pos);
    const latlngs = STATE.trail.getLatLngs();
    latlngs.push(pos);
    if (latlngs.length > 200) latlngs.shift();
    STATE.trail.setLatLngs(latlngs);
    if (STATE.mission === 'cansat') STATE.map.panTo(pos, { animate: true, duration: 0.5 });
}

/* ============ 3D ORIENTATION (Three.js) ============ */
function initThree() {
    const container = $('#threeContainer');
    if (!container) return;

    // Clean up previous
    if (STATE.threeRenderer) {
        container.removeChild(STATE.threeRenderer.domElement);
        STATE.threeRenderer.dispose();
    }

    const w = container.clientWidth;
    const h = container.clientHeight || 220;

    STATE.threeScene = new THREE.Scene();
    STATE.threeCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    STATE.threeCamera.position.set(3, 2.5, 4);
    STATE.threeCamera.lookAt(0, 0, 0);

    STATE.threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    STATE.threeRenderer.setSize(w, h);
    STATE.threeRenderer.setClearColor(0x000000, 0);
    container.appendChild(STATE.threeRenderer.domElement);

    // Lights
    STATE.threeScene.add(new THREE.AmbientLight(0x8899cc, 0.6));
    const dl = new THREE.DirectionalLight(0x00E5FF, 1);
    dl.position.set(5, 5, 5);
    STATE.threeScene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xFFD54F, 0.4);
    dl2.position.set(-5, -3, -5);
    STATE.threeScene.add(dl2);

    // Body (different for CanSat vs CubeSat)
    const group = new THREE.Group();

    if (STATE.mission === 'cansat') {
        // CanSat = tin-can cylinder
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 32);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x00E5FF, metalness: 0.7, roughness: 0.3,
            emissive: 0x00E5FF, emissiveIntensity: 0.15
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Top cap
        const capGeo = new THREE.CylinderGeometry(0.55, 0.5, 0.15, 32);
        const capMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, metalness: 0.5, roughness: 0.4 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.775;
        group.add(cap);

        // Antenna
        const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
        const antMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const ant = new THREE.Mesh(antGeo, antMat);
        ant.position.y = 1.15;
        group.add(ant);

    } else {
        // CubeSat 1U
        const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x94A3B8, metalness: 0.85, roughness: 0.25
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Solar panels
        const panelGeo = new THREE.BoxGeometry(1.4, 0.05, 0.9);
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x1e3a8a, metalness: 0.4, roughness: 0.6,
            emissive: 0x00E5FF, emissiveIntensity: 0.1
        });
        const p1 = new THREE.Mesh(panelGeo, panelMat);
        p1.position.x = 1.2;
        group.add(p1);
        const p2 = new THREE.Mesh(panelGeo, panelMat);
        p2.position.x = -1.2;
        group.add(p2);

        // Antenna
        const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
        const antMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const ant = new THREE.Mesh(antGeo, antMat);
        ant.position.y = 0.8;
        group.add(ant);
    }

    // Axis lines
    const axesHelper = new THREE.AxesHelper(1.5);
    group.add(axesHelper);

    STATE.threeCube = group;
    STATE.threeScene.add(group);

    // Grid
    const grid = new THREE.GridHelper(4, 8, 0x00E5FF, 0x1a2338);
    grid.position.y = -1.2;
    STATE.threeScene.add(grid);

    // Resize handling
    window.addEventListener('resize', onThreeResize);

    // Animate loop
    function animate() {
        requestAnimationFrame(animate);
        STATE.threeRenderer.render(STATE.threeScene, STATE.threeCamera);
    }
    animate();
}

function onThreeResize() {
    const container = $('#threeContainer');
    if (!container || !STATE.threeRenderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight || 220;
    STATE.threeCamera.aspect = w / h;
    STATE.threeCamera.updateProjectionMatrix();
    STATE.threeRenderer.setSize(w, h);
}

function updateThree(data) {
    if (!STATE.threeCube) return;
    STATE.threeCube.rotation.x = THREE.MathUtils.degToRad(data.pitch);
    STATE.threeCube.rotation.z = THREE.MathUtils.degToRad(data.roll);
    STATE.threeCube.rotation.y = THREE.MathUtils.degToRad(data.yaw);
}

/* ============ ARTIFICIAL HORIZON ============ */
function updateHorizon(data) {
    const inner = $('#ahInner');
    if (!inner) return;
    inner.style.transform = `rotate(${-data.roll}deg) translateY(${data.pitch * 1.2}px)`;
}

/* ============ ERROR CODE SYSTEM ============ */
function updateErrorCode(code) {
    // code is 4-char string, e.g. "0000" or "1111"
    STATE.errorCode = code;
    for (let i = 0; i < 4; i++) {
        const el = $(`#ec${i + 1}`);
        el.textContent = code[i];
        if (code[i] === '1') el.classList.add('error');
        else el.classList.remove('error');
    }
}

function computeErrorCode(data) {
    let d1 = 0, d2 = 0, d3 = 0, d4 = 0;
    if (STATE.mission === 'cansat') {
        // D1: Descent Rate abnormal (>15 m/s or <2 during descent)
        if (data.descentRate > 15) d1 = 1;
        // D2: GPS < 4 sats
        if (data.satellites < 4) d2 = 1;
        // D3: Payload not separated below 400m
        if (data.altitude < 400 && data.altitude > 50 && !STATE.cansat.payloadSeparated) d3 = 1;
        // D4: Parachute not deployed below 150m
        if (data.altitude < 150 && data.altitude > 10 && !STATE.cansat.parachuteDeployed) d4 = 1;
    } else {
        // CubeSat equivalent
        if (Math.abs(STATE.cubesat.gyroZ) > 5) d1 = 1;
        if (data.rssi < -100) d2 = 1;
        if (!STATE.cubesat.solarDeployed && STATE.cubesat.t > 30) d3 = 1;
        if (data.battery < 6.8) d4 = 1;
    }
    return `${d1}${d2}${d3}${d4}`;
}

/* ============ CAMERA (MediaDevices API) ============ */
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        STATE.cameraStream = stream;
        const video = $('#cameraVideo');
        video.srcObject = stream;
        video.classList.add('active');
        $('#cameraPlaceholder').classList.add('hidden');
        $('#cameraOverlay').classList.add('active');
        $('#cameraBadge').innerHTML = '<span class="dot dot-green"></span>ONLINE';
        STATE.cameraStartTime = Date.now();
        log('Camera stream initialized', 'success');
        toast('CAMERA', 'Live feed active', 'success');
    } catch (err) {
        log(`Camera error: ${err.message}`, 'error');
        toast('CAMERA ERROR', err.message, 'error');
    }
}

function stopCamera() {
    if (STATE.cameraStream) {
        STATE.cameraStream.getTracks().forEach(t => t.stop());
        STATE.cameraStream = null;
    }
    const video = $('#cameraVideo');
    video.srcObject = null;
    video.classList.remove('active');
    $('#cameraPlaceholder').classList.remove('hidden');
    $('#cameraOverlay').classList.remove('active');
    $('#cameraBadge').innerHTML = '<span class="dot dot-red"></span>OFFLINE';
    STATE.cameraStartTime = null;
    $('#cameraTime').textContent = '00:00:00';
    log('Camera stream closed', 'info');
}

function toggleFullscreen() {
    const wrap = document.querySelector('.camera-wrap');
    if (!document.fullscreenElement) {
        wrap.requestFullscreen?.() || wrap.webkitRequestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

/* ============ WEB SERIAL API ============ */
async function connectSerial() {
    if (!('serial' in navigator)) {
        toast('SERIAL', 'Web Serial API not supported in this browser', 'warning');
        return;
    }
    try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        STATE.serialPort = port;
        $('#serialStatus').innerHTML = '<span class="dot dot-green"></span> Connected';
        log('Serial port connected @ 9600', 'success');
        toast('SERIAL', 'Hardware connection established', 'success');
        // Disable simulation
        $('#simToggle').checked = false;
        STATE.simulation = false;
        $('#footerMode').textContent = 'HARDWARE';

        // Start reading loop
        const decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable);
        const reader = decoder.readable.getReader();
        STATE.serialReader = reader;
        readSerialLoop(reader);
    } catch (err) {
        log(`Serial error: ${err.message}`, 'error');
        toast('SERIAL ERROR', err.message, 'error');
    }
}

async function readSerialLoop(reader) {
    let buffer = '';
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let idx;
            while ((idx = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                parseSerialLine(line);
            }
        }
    } catch (err) {
        log(`Serial read error: ${err.message}`, 'error');
    }
}

function parseSerialLine(line) {
    // Expected format (CSV): packets,time,alt,press,temp,hum,batt,lat,lon,sats,pitch,roll,yaw,descentRate,state
    if (!line || line.startsWith('#')) return;
    const parts = line.split(',');
    if (STATE.mission === 'cansat' && parts.length >= 15) {
        const data = {
            packets: parseInt(parts[0]) || STATE.packets,
            missionTime: parts[1],
            altitude: parseFloat(parts[2]) || 0,
            pressure: parseFloat(parts[3]) || 0,
            temperature: parseFloat(parts[4]) || 0,
            humidity: parseFloat(parts[5]) || 0,
            battery: parseFloat(parts[6]) || 0,
            lat: parseFloat(parts[7]) || 0,
            lon: parseFloat(parts[8]) || 0,
            satellites: parseInt(parts[9]) || 0,
            pitch: parseFloat(parts[10]) || 0,
            roll: parseFloat(parts[11]) || 0,
            yaw: parseFloat(parts[12]) || 0,
            descentRate: parseFloat(parts[13]) || 0,
            state: parts[14] || 'UNKNOWN',
            containerAlt: parseFloat(parts[15]) || parseFloat(parts[2]),
            payloadAlt: parseFloat(parts[16]) || parseFloat(parts[2])
        };
        STATE.packets = data.packets;
        processTelemetry(data);
    }
}

async function disconnectSerial() {
    try {
        if (STATE.serialReader) {
            await STATE.serialReader.cancel();
            STATE.serialReader = null;
        }
        if (STATE.serialPort) {
            await STATE.serialPort.close();
            STATE.serialPort = null;
        }
        $('#serialStatus').innerHTML = '<span class="dot dot-red"></span> Disconnected';
        log('Serial port disconnected', 'info');
    } catch (err) {
        log(`Disconnect error: ${err.message}`, 'error');
    }
}

/* ============ TELEMETRY PROCESSING ============ */
function processTelemetry(data) {
    STATE.currentData = data;
    STATE.telemetryHistory.push({ ...data, timestamp: Date.now() });
    if (STATE.telemetryHistory.length > 3600) STATE.telemetryHistory.shift();

    renderTelemetry(data);
    updateCharts(data);
    updateMap(data);
    updateThree(data);
    updateHorizon(data);

    const code = computeErrorCode(data);
    updateErrorCode(code);

    // Simulated bandwidth
    $('#footerUplink').textContent = `${(1.2 + Math.random() * 0.3).toFixed(1)} kbps`;
    $('#footerDownlink').textContent = `${(3.5 + Math.random() * 0.8).toFixed(1)} kbps`;
    STATE.lastPacketTime = Date.now();
}

/* ============ MAIN LOOP ============ */
function tick() {
    if (!STATE.telemetryRunning) return;
    if (STATE.simulation) {
        STATE.packets++;
        const data = STATE.mission === 'cansat' ? simulateCanSat() : simulateCubeSat();
        processTelemetry(data);
    }
    // Hardware mode: data comes from serial parser
}

function startTelemetry() {
    if (STATE.telemetryRunning) return;
    STATE.telemetryRunning = true;
    STATE.missionStartTime = Date.now();
    $('#telemetryStatus').innerHTML = '<span class="dot dot-green"></span>ONLINE';
    $('#missionStatus').innerHTML = '<span class="dot dot-green"></span>ACTIVE';
    STATE.mainInterval = setInterval(tick, 1000);
    log('Telemetry stream started', 'success');
    toast('TELEMETRY', 'Data acquisition initiated', 'success');
}

function stopTelemetry() {
    if (!STATE.telemetryRunning) return;
    STATE.telemetryRunning = false;
    clearInterval(STATE.mainInterval);
    $('#telemetryStatus').innerHTML = '<span class="dot dot-red"></span>OFFLINE';
    $('#missionStatus').innerHTML = '<span class="dot dot-yellow"></span>STANDBY';
    log('Telemetry stream stopped', 'warning');
    toast('TELEMETRY', 'Data acquisition halted', 'warning');
}

function resetPackets() {
    STATE.packets = 0;
    STATE.telemetryHistory = [];
    STATE.missionStartTime = Date.now();
    // Reset all charts
    Object.values(STATE.charts).forEach(c => {
        c.data.labels = [];
        c.data.datasets[0].data = [];
        c.update();
    });
    // Reset trail
    if (STATE.trail) STATE.trail.setLatLngs([]);
    // Reset mission state
    if (STATE.mission === 'cansat') {
        Object.assign(STATE.cansat, {
            altitude: 700, vertVel: 0, t: 0, launched: false,
            state: 'PRE-LAUNCH', parachuteDeployed: false,
            payloadSeparated: false, containerAlt: 700, payloadAlt: 700
        });
    } else {
        Object.assign(STATE.cubesat, { t: 0, theta: 0, phase: 'DEPLOYMENT' });
    }
    log('Packets and history reset', 'info');
    toast('RESET', 'Mission counters cleared', 'success');
}

/* ============ MISSION SWITCH ============ */
function switchMission(mission) {
    if (STATE.mission === mission) return;
    STATE.mission = mission;
    $$('.mission-btn').forEach(b => b.classList.toggle('active', b.dataset.mission === mission));
    if (mission === 'cansat') {
        $('#cansatControls').classList.remove('hidden');
        $('#cubesatControls').classList.add('hidden');
    } else {
        $('#cansatControls').classList.add('hidden');
        $('#cubesatControls').classList.remove('hidden');
    }
    buildTelemetryGrid();
    initCharts();
    initMap();
    initThree();
    log(`Mission switched to ${mission.toUpperCase()}`, 'info');
    toast('MISSION MODE', `Switched to ${mission.toUpperCase()} operations`, 'success');
}

/* ============ COMMAND EXECUTION ============ */
function executeCommand(cmd, btn) {
    if (btn) {
        btn.classList.add('executing');
        setTimeout(() => btn.classList.remove('executing'), 600);
    }

    const timestamp = new Date().toTimeString().slice(0, 8);
    let result = 'EXECUTED';
    let logType = 'success';

    switch (cmd) {
        case 'manual_sep':
            STATE.cansat.payloadSeparated = true;
            STATE.cansat.state = 'MANUAL_SEP';
            result = 'Container-Payload separation triggered';
            log('CMD: Manual separation executed', 'success');
            break;
        case 'parachute':
            STATE.cansat.parachuteDeployed = true;
            result = 'Emergency parachute deployed';
            log('CMD: Emergency parachute deployed', 'success');
            break;
        case 'payload':
            STATE.cansat.payloadActivated = true;
            result = 'Payload experiment activated';
            log('CMD: Payload activated', 'success');
            break;
        case 'reset_mission':
            resetPackets();
            result = 'Mission counters reset';
            break;
        case 'emergency_stop':
            stopTelemetry();
            result = 'EMERGENCY STOP triggered';
            logType = 'error';
            log('CMD: EMERGENCY STOP', 'error');
            break;
        case 'safe_mode':
            STATE.cubesat.safeMode = !STATE.cubesat.safeMode;
            result = `Safe mode ${STATE.cubesat.safeMode ? 'ENABLED' : 'DISABLED'}`;
            log(`CMD: Safe mode ${STATE.cubesat.safeMode ? 'ON' : 'OFF'}`, 'warning');
            break;
        case 'deploy_solar':
            STATE.cubesat.solarDeployed = true;
            STATE.cubesat.solarOutput = 32;
            result = 'Solar panels deployed';
            log('CMD: Solar panels deployed', 'success');
            break;
        case 'enable_payload':
            STATE.cubesat.payloadStatus = 'ACTIVE';
            result = 'Payload experiment enabled';
            log('CMD: Payload enabled', 'success');
            break;
        case 'attitude_control':
            STATE.cubesat.pitch *= 0.1;
            STATE.cubesat.roll *= 0.1;
            result = 'Attitude control engaged';
            log('CMD: Attitude control engaged', 'success');
            break;
        case 'comm_reset':
            STATE.cubesat.comm = 'NOMINAL';
            STATE.cubesat.rssi = -70;
            result = 'Communication system reset';
            log('CMD: Comm reset', 'success');
            break;
    }

    // Add to command status
    const csContainer = $('#cmdStatus');
    if (csContainer.querySelector('.cs-empty')) csContainer.innerHTML = '';
    const item = document.createElement('div');
    item.className = `cs-item ${logType}`;
    item.innerHTML = `<span>${cmd.replace(/_/g, ' ').toUpperCase()}</span><span class="cs-time">${timestamp}</span>`;
    csContainer.insertBefore(item, csContainer.firstChild);
    while (csContainer.children.length > 8) csContainer.removeChild(csContainer.lastChild);

    toast('COMMAND EXECUTED', result, logType);
}

/* ============ CSV EXPORT ============ */
function exportCSV() {
    if (STATE.telemetryHistory.length === 0) {
        toast('EXPORT', 'No telemetry data to export', 'warning');
        return;
    }
    const fields = STATE.mission === 'cansat' ? CANSAT_FIELDS : CUBESAT_FIELDS;
    const headers = ['timestamp', ...fields.map(f => f.key)];
    const rows = [headers.join(',')];
    STATE.telemetryHistory.forEach(row => {
        rows.push(headers.map(h => {
            const v = row[h];
            if (typeof v === 'number') return v.toFixed(4);
            return v ?? '';
        }).join(','));
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${STATE.mission}_telemetry_${new Date().toISOString().slice(0,19).replace(/[:.]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    log(`CSV exported (${STATE.telemetryHistory.length} rows)`, 'success');
    toast('CSV EXPORTED', `${STATE.telemetryHistory.length} telemetry rows saved`, 'success');
}

function exportGraph() {
    const chartIds = ['chartAltitude', 'chartTemperature', 'chartPressure', 'chartBattery'];
    chartIds.forEach((id, idx) => {
        const canvas = $(`#${id}`);
        if (!canvas) return;
        setTimeout(() => {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${STATE.mission}_chart_${id}_${Date.now()}.png`;
            a.click();
        }, idx * 300);
    });
    log('Chart images exported', 'success');
    toast('GRAPHS EXPORTED', '4 chart images downloaded', 'success');
}

/* ============ THEME ============ */
function toggleTheme() {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme', STATE.theme === 'light');
    $('#btnTheme').textContent = STATE.theme === 'dark' ? '🌙' : '☀️';
    log(`Theme: ${STATE.theme}`, 'info');
    // Reinit map to force tile filter refresh
    setTimeout(() => {
        const tilePane = STATE.map?.getPane('tilePane');
        if (tilePane) {
            tilePane.style.filter = STATE.theme === 'dark'
                ? 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)'
                : 'none';
        }
    }, 100);
}

/* ============ SYNC TIME ============ */
function syncTime() {
    STATE.missionStartTime = Date.now();
    log('PC time synchronized with mission clock', 'success');
    toast('TIME SYNC', 'Mission clock aligned to system time', 'success');
}

/* ============ EVENT BINDINGS ============ */
function bindEvents() {
    $('#btnStart').addEventListener('click', startTelemetry);
    $('#btnStop').addEventListener('click', stopTelemetry);
    $('#btnCSV').addEventListener('click', exportCSV);
    $('#btnExportGraph').addEventListener('click', exportGraph);
    $('#btnSyncTime').addEventListener('click', syncTime);
    $('#btnReset').addEventListener('click', resetPackets);
    $('#btnTheme').addEventListener('click', toggleTheme);

    $('#btnCanSat').addEventListener('click', () => switchMission('cansat'));
    $('#btnCubeSat').addEventListener('click', () => switchMission('cubesat'));

    $('#btnCameraStart').addEventListener('click', startCamera);
    $('#btnCameraStop').addEventListener('click', stopCamera);
    $('#btnCameraFull').addEventListener('click', toggleFullscreen);

    $('#btnSerialConnect').addEventListener('click', connectSerial);
    $('#btnSerialDisconnect').addEventListener('click', disconnectSerial);

    $('#btnClearLogs').addEventListener('click', () => {
        $('#logContainer').innerHTML = '';
        STATE.logs = [];
    });

    $('#simToggle').addEventListener('change', e => {
        STATE.simulation = e.target.checked;
        $('#footerMode').textContent = STATE.simulation ? 'SIMULATION' : 'HARDWARE';
        log(`Simulation mode: ${STATE.simulation ? 'ON' : 'OFF'}`, 'info');
    });

    // Command buttons
    $$('.cmd-btn').forEach(btn => {
        if (btn.dataset.cmd) {
            btn.addEventListener('click', () => executeCommand(btn.dataset.cmd, btn));
        }
    });

    // Error code samples
    $$('.ec-sample').forEach(btn => {
        btn.addEventListener('click', () => {
            updateErrorCode(btn.dataset.code);
            toast('ERROR CODE', `Displaying ${btn.dataset.code}`, 'info');
        });
    });

    // Window resize
    window.addEventListener('resize', () => {
        onThreeResize();
        if (STATE.map) STATE.map.invalidateSize();
    });
}

/* ============ WEBSOCKET (SIMULATION MODE) ============ */
// Optional: connect to a mock WebSocket server for multi-client demos.
// Since no backend is available, we implement a same-tab BroadcastChannel fallback.
function initWebSocketSim() {
    try {
        const bc = new BroadcastChannel('gcs-telemetry');
        bc.onmessage = (ev) => {
            if (ev.data?.type === 'telemetry') {
                // Consume telemetry from a peer tab if simulation is off
                if (!STATE.simulation && !STATE.serialPort) {
                    processTelemetry(ev.data.payload);
                }
            }
        };
        STATE._bc = bc;
        // Broadcast our telemetry to any listeners
        const origProcess = processTelemetry;
        window.processTelemetry = (data) => {
            origProcess(data);
            try { bc.postMessage({ type: 'telemetry', payload: data }); } catch (e) {}
        };
    } catch (e) {
        // BroadcastChannel not supported - ignore
    }
}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
    runBoot();
    buildTelemetryGrid();
    initCharts();
    initMap();
    initThree();
    bindEvents();
    initWebSocketSim();

    // Continuous clock update
    setInterval(updateClocks, 1000);
    updateClocks();

    // Auto-start after boot
    setTimeout(() => {
        startTelemetry();
    }, 3200);
});
