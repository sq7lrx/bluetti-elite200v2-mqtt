/**
 * Publishes synthetic Elite 200 V2 telemetry so the dashboard can be developed
 * without a real device. Usage: node tools/simulate.js
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mqtt from 'mqtt'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true })

const root = (process.env.MQTT_TOPIC || 'bluetti').replace(/\/+$/, '')
const device = process.env.SIM_DEVICE || 'ELITE200V2-2314000000001'
const prefix = `${root}/state/${device}/`

const client = mqtt.connect(`mqtt://${process.env.MQTT_HOST || 'localhost'}:${process.env.MQTT_PORT || 1883}`, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
})

let soc = 62
let tick = 0

client.on('connect', () => {
  console.log(`[sim] publishing to ${prefix}*`)

  client.subscribe(`${root}/command/${device}/+`)

  setInterval(() => {
    tick += 1
    const solar = Math.max(0, Math.round(420 + 180 * Math.sin(tick / 20)))
    const gridIn = tick % 90 < 45 ? 0 : 600
    const acOut = Math.max(0, Math.round(260 + 120 * Math.sin(tick / 7)))
    const dcOut = Math.round(35 + 10 * Math.sin(tick / 11))
    const net = solar + gridIn - acOut - dcOut
    soc = Math.min(100, Math.max(0, soc + net / 90000))

    const values = {
      total_battery_percent: soc.toFixed(0),
      total_battery_voltage: (51.2 + soc / 200).toFixed(2),
      total_battery_current: (net / 51.2).toFixed(1),
      dc_input_power: solar,
      ac_input_power: gridIn,
      ac_output_power: acOut,
      dc_output_power: dcOut,
      ac_input_voltage: (230 + Math.sin(tick / 5)).toFixed(1),
      ac_input_frequency: (50 + Math.sin(tick / 9) / 20).toFixed(1),
      internal_ac_voltage: (229 + Math.sin(tick / 6)).toFixed(1),
      internal_ac_frequency: '50.0',
      internal_current_one: (acOut / 230).toFixed(1),
      internal_power_one: acOut,
      dc_input_voltage1: (48 + Math.sin(tick / 8) * 2).toFixed(1),
      dc_input_power1: solar,
      dc_input_current1: (solar / 48).toFixed(1),
      power_generation: (1234.5 + tick / 600).toFixed(1),
      ac_output_on: 'ON',
      dc_output_on: 'ON',
      grid_charge_on: gridIn > 0 ? 'ON' : 'OFF',
      eco_on: 'OFF',
      power_lifting_on: 'OFF',
      time_control_on: 'OFF',
      charging_mode: 'STANDARD',
      ups_mode: 'CUSTOMIZED',
      led_mode: 'LOW',
      battery_range_start: '10',
      battery_range_end: '100',
    }

    for (const [field, value] of Object.entries(values)) {
      client.publish(prefix + field, String(value))
    }

    client.publish(
      `${prefix}pack_details1`,
      JSON.stringify({
        status: 'NORMAL',
        percent: Math.round(soc),
        voltage: Number((51.2 + soc / 200).toFixed(2)),
        voltages: Array.from({ length: 16 }, (_, i) =>
          Number((3.2 + soc / 2000 + Math.sin(tick / 10 + i) / 400).toFixed(3)),
        ),
      }),
    )
  }, 1000)
})

client.on('message', (topic, payload) => {
  console.log(`[sim] command ${topic} = ${payload.toString()}`)
})
