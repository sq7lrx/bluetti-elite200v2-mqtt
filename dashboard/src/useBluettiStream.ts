import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeviceState, FieldValue, ServerMessage } from './types'

const MAX_HISTORY = 360

export interface Connection {
  connected: boolean
  mqttConnected: boolean
  devices: DeviceState[]
  historyFields: string[]
  broker: { host: string; port: number } | null
  sendCommand: (device: string, field: string, value: FieldValue) => void
}

function socketUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${location.host}/ws`
}

export function useBluettiStream(): Connection {
  const [connected, setConnected] = useState(false)
  const [mqttConnected, setMqttConnected] = useState(false)
  const [devices, setDevices] = useState<DeviceState[]>([])
  const [historyFields, setHistoryFields] = useState<string[]>([])
  const [broker, setBroker] = useState<{ host: string; port: number } | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let closed = false
    let retry: ReturnType<typeof setTimeout>

    const connect = () => {
      const socket = new WebSocket(socketUrl())
      socketRef.current = socket

      socket.onopen = () => setConnected(true)

      socket.onclose = () => {
        setConnected(false)
        setMqttConnected(false)
        if (!closed) retry = setTimeout(connect, 2000)
      }

      socket.onmessage = (event) => {
        const message: ServerMessage = JSON.parse(event.data)
        switch (message.type) {
          case 'snapshot':
            setMqttConnected(message.mqtt.connected)
            setBroker({ host: message.mqtt.host, port: message.mqtt.port })
            setHistoryFields(message.historyFields)
            setDevices(message.devices)
            break
          case 'mqtt':
            setMqttConnected(message.connected)
            break
          case 'update':
            setDevices((prev) => {
              const index = prev.findIndex((d) => d.id === message.device)
              const device: DeviceState =
                index >= 0
                  ? prev[index]
                  : { id: message.device, lastSeen: 0, fields: {}, history: [] }
              const next: DeviceState = {
                ...device,
                lastSeen: message.at,
                fields: { ...device.fields, [message.field]: { value: message.value, at: message.at } },
              }
              if (index < 0) return [...prev, next]
              const copy = [...prev]
              copy[index] = next
              return copy
            })
            break
          case 'history':
            setDevices((prev) =>
              prev.map((device) =>
                device.id === message.device
                  ? { ...device, history: [...device.history, message.point].slice(-MAX_HISTORY) }
                  : device,
              ),
            )
            break
        }
      }
    }

    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      socketRef.current?.close()
    }
  }, [])

  const sendCommand = useCallback((device: string, field: string, value: FieldValue) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'command', device, field, value }))
    }
  }, [])

  return { connected, mqttConnected, devices, historyFields, broker, sendCommand }
}
