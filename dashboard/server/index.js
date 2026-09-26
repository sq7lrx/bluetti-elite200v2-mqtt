import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mqtt from 'mqtt'
import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')

dotenv.config({ path: path.join(rootDir, '.env'), quiet: true })
dotenv.config({ path: path.join(rootDir, 'dashboard', '.env'), override: true, quiet: true })

const config = {
  mqttHost: process.env.MQTT_HOST || 'localhost',
  mqttPort: Number(process.env.MQTT_PORT || 1883),
  mqttUsername: process.env.MQTT_USERNAME || undefined,
  mqttPassword: process.env.MQTT_PASSWORD || undefined,
  topicRoot: (process.env.MQTT_TOPIC || 'bluetti').replace(/\/+$/, ''),
  port: Number(process.env.DASHBOARD_PORT || 8787),
  host: process.env.DASHBOARD_HOST || '0.0.0.0',
  historyPoints: Number(process.env.DASHBOARD_HISTORY_POINTS || 360),
}

const STATE_TOPIC = `${config.topicRoot}/state/+/+`
const HISTORY_FIELDS = [
  'total_battery_percent',
  'dc_input_power',
  'ac_input_power',
  'ac_output_power',
  'dc_output_power',
  'total_battery_voltage',
  'total_battery_current',
]

/** deviceId -> { fields: Map<name, {value, at}>, lastSeen } */
const devices = new Map()
/** deviceId -> { t: number[], [field]: number[] } */
const history = new Map()

let mqttConnected = false

function deviceEntry(id) {
  if (!devices.has(id)) {
    devices.set(id, { id, fields: {}, lastSeen: 0 })
    history.set(id, { t: [] })
  }
  return devices.get(id)
}

function coerce(raw) {
  const text = raw.toString('utf8').trim()
  if (text === '') return null
  if (text === 'ON') return true
  if (text === 'OFF') return false
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  const num = Number(text)
  return Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(text) ? num : text
}

function pushHistory(deviceId, at) {
  const series = history.get(deviceId)
  const fields = devices.get(deviceId).fields
  // Sample at most once per second to keep the series compact.
  const last = series.t[series.t.length - 1]
  if (last && at - last < 1000) return null

  series.t.push(at)
  const point = { t: at }
  for (const field of HISTORY_FIELDS) {
    if (!series[field]) series[field] = []
    const value = fields[field]?.value
    const num = typeof value === 'number' ? value : null
    series[field].push(num)
    point[field] = num
  }
  if (series.t.length > config.historyPoints) {
    series.t.shift()
    for (const field of HISTORY_FIELDS) series[field].shift()
  }
  return point
}

function historyPoints(deviceId) {
  const series = history.get(deviceId)
  if (!series) return []
  return series.t.map((t, i) => {
    const point = { t }
    for (const field of HISTORY_FIELDS) point[field] = series[field]?.[i] ?? null
    return point
  })
}

function snapshot() {
  return {
    type: 'snapshot',
    mqtt: { connected: mqttConnected, host: config.mqttHost, port: config.mqttPort },
    historyFields: HISTORY_FIELDS,
    devices: [...devices.values()].map((d) => ({
      id: d.id,
      lastSeen: d.lastSeen,
      fields: d.fields,
      history: historyPoints(d.id),
    })),
  }
}

const sockets = new Set()

function broadcast(message) {
  const payload = JSON.stringify(message)
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(payload)
  }
}

const client = mqtt.connect(`mqtt://${config.mqttHost}:${config.mqttPort}`, {
  username: config.mqttUsername,
  password: config.mqttPassword,
  clientId: `bluetti-dashboard-${Math.random().toString(16).slice(2, 10)}`,
  reconnectPeriod: 5000,
})

client.on('connect', () => {
  mqttConnected = true
  console.log(`[mqtt] connected to ${config.mqttHost}:${config.mqttPort}`)
  client.subscribe(STATE_TOPIC, (err) => {
    if (err) console.error('[mqtt] subscribe failed:', err.message)
    else console.log(`[mqtt] subscribed to ${STATE_TOPIC}`)
  })
  broadcast({ type: 'mqtt', connected: true })
})

client.on('close', () => {
  if (mqttConnected) console.warn('[mqtt] disconnected')
  mqttConnected = false
  broadcast({ type: 'mqtt', connected: false })
})

client.on('error', (err) => console.error('[mqtt] error:', err.message))

client.on('message', (topic, payload) => {
  const parts = topic.split('/')
  if (parts.length !== 4 || parts[1] !== 'state') return
  const [, , deviceId, field] = parts
  const at = Date.now()
  const device = deviceEntry(deviceId)
  device.fields[field] = { value: coerce(payload), at }
  device.lastSeen = at

  broadcast({ type: 'update', device: deviceId, field, value: device.fields[field].value, at })
  const point = pushHistory(deviceId, at)
  if (point) broadcast({ type: 'history', device: deviceId, point })
})

const distDir = path.join(__dirname, '..', 'dist')
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

function serveStatic(req, res) {
  if (!fs.existsSync(distDir)) {
    res.writeHead(503, { 'content-type': 'text/plain' })
    res.end('Dashboard is not built yet. Run "npm run build", or use "npm run dev".')
    return
  }
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = path.join(distDir, urlPath)
  if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(distDir, 'index.html')
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/state') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(snapshot()))
    return
  }
  serveStatic(req, res)
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket) => {
  sockets.add(socket)
  socket.send(JSON.stringify(snapshot()))

  socket.on('message', (raw) => {
    let message
    try {
      message = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (message.type !== 'command') return
    const { device, field, value } = message
    // Device IDs contain spaces (e.g. "Elite 200 V2-2545115936760"), so only
    // reject characters that would break out of the topic or match wildcards.
    if (typeof device !== 'string' || !device || /[/+#\u0000-\u001f]/.test(device)) return
    if (!/^[a-z0-9_]+$/.test(field || '')) return
    const payload = typeof value === 'boolean' ? (value ? 'ON' : 'OFF') : String(value)
    const topic = `${config.topicRoot}/command/${device}/${field}`
    client.publish(topic, payload, (err) => {
      if (err) console.error('[mqtt] publish failed:', err.message)
      else console.log(`[mqtt] published ${topic} = ${payload}`)
    })
  })

  socket.on('close', () => sockets.delete(socket))
})

// Keep connections alive through proxies and drop dead ones.
setInterval(() => {
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.ping()
  }
}, 30000).unref()

server.listen(config.port, config.host, () => {
  console.log(`[http] dashboard on http://${config.host}:${config.port}`)
})
